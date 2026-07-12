import "server-only";

import { prisma } from "@/lib/prisma";

// Update the user's division (the one-time gate after first sign-in).
export async function updateUserDivision(userId: string, division: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { division } });
}

// Whether the user has already acknowledged the 30-day data-retention notice
// shown once right after sign-in.
export async function hasSeenRetentionNotice(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { retentionNoticeAcknowledgedAt: true },
  });
  return user?.retentionNoticeAcknowledgedAt != null;
}

export async function acknowledgeRetentionNotice(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { retentionNoticeAcknowledgedAt: new Date() },
  });
}
