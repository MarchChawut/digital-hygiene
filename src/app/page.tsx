import DigitalHygieneApp from "@/components/DigitalHygieneApp";
import { auth } from "@/auth";
import { listItems } from "@/services/checklist.service";
import * as surveyService from "@/services/survey.service";
import * as userService from "@/services/user.service";
import type { SessionUser } from "@/models/session";
import type { SurveyQuestion } from "@/models/survey";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [session, checklistItems, { error }] = await Promise.all([
    auth(),
    listItems(),
    searchParams,
  ]);
  const user: SessionUser | null = session?.user
    ? {
        email: session.user.email ?? "",
        name: session.user.name ?? null,
        image: session.user.image ?? null,
        division: session.user.division ?? null,
        isAdmin: session.user.isAdmin ?? false,
      }
    : null;

  // Fetched here (server-side) instead of client useEffects in
  // DigitalHygieneApp.tsx, so signed-in visitors get these already baked into
  // the first render — no post-hydration round trip or dialog flash.
  let surveyQuestions: SurveyQuestion[] = [];
  let alreadyResponded = true;
  let showRetentionNotice = false;
  if (session?.user?.id) {
    [surveyQuestions, alreadyResponded, showRetentionNotice] = await Promise.all([
      surveyService.listQuestions(),
      surveyService.hasResponded(user!.email),
      userService.hasSeenRetentionNotice(session.user.id).then((seen) => !seen),
    ]);
  }

  return (
    <DigitalHygieneApp
      user={user}
      checklistItems={checklistItems}
      authError={error ?? null}
      initialSurveyQuestions={surveyQuestions}
      initialAlreadyResponded={alreadyResponded}
      initialShowRetentionNotice={showRetentionNotice}
    />
  );
}
