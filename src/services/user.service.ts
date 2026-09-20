import "server-only";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("user");

// Update the user's division (the one-time gate after first sign-in).
export async function updateUserDivision(userId: string, division: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { division } });
  log.info("division_set", { userId, division });
}

export async function acknowledgeRetentionNotice(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { retentionNoticeAcknowledgedAt: new Date() },
  });
}
