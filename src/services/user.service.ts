import "server-only";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("user");

// Set the user's division — the one-time gate after first sign-in. It is only written while
// still unset (a conditional UPDATE, so it is race-safe): the UI says "choose once", and every
// record snapshots the division, so letting it be re-pointed at will would let one account
// file results under any division.
export async function setDivisionOnce(
  userId: string,
  division: string
): Promise<"set" | "unchanged" | "already_set"> {
  const res = await prisma.user.updateMany({ where: { id: userId, division: null }, data: { division } });
  if (res.count > 0) {
    log.info("division_set", { userId, division });
    return "set";
  }
  const current = await prisma.user.findUnique({ where: { id: userId }, select: { division: true } });
  return current?.division === division ? "unchanged" : "already_set";
}

export async function acknowledgeRetentionNotice(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { retentionNoticeAcknowledgedAt: new Date() },
  });
}

// Support tool: clear one address's division so the "choose your division" gate shows again (the
// choice is otherwise final — see setDivisionOnce). Records already saved keep the division they
// were filed under. Returns whether an account with that address exists.
export async function resetDivision(email: string): Promise<boolean> {
  const res = await prisma.user.updateMany({ where: { email }, data: { division: null } });
  return res.count > 0;
}

// Erasure on request: everything held for one e-mail address. The User row cascades to its
// sessions and linked accounts. The audit trail is kept for incident response but the address
// in it is replaced, so it no longer identifies the person.
export async function deleteAllDataForEmail(email: string): Promise<{
  userDeleted: boolean;
  records: number;
  surveyResponses: number;
  auditRows: number;
}> {
  const [records, surveyResponses, , audit, user] = await prisma.$transaction([
    prisma.assessmentRecord.deleteMany({ where: { email } }),
    prisma.surveyResponse.deleteMany({ where: { email } }),
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    prisma.auditLog.updateMany({ where: { actorEmail: email }, data: { actorEmail: "deleted-user" } }),
    prisma.user.deleteMany({ where: { email } }),
  ]);
  return {
    userDeleted: user.count > 0,
    records: records.count,
    surveyResponses: surveyResponses.count,
    auditRows: audit.count,
  };
}
