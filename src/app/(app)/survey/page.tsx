import { redirect } from "next/navigation";
import { getSession } from "@/app/session";
import * as surveyService from "@/services/survey.service";
import * as recordService from "@/services/record.service";
import { listItems } from "@/services/checklist.service";
import { allSectionsDone } from "@/lib/completion";
import { SurveyPanel } from "@/components/SurveyPanel";
import { loginPath } from "@/lib/safe-redirect";
import { DivisionGuard } from "../DivisionGuard";

// The satisfaction survey as its own tab (/survey) — reachable at any time, not only
// after finishing the 4 sections, and linkable from a QR code.
export default async function Page() {
  // Signed out → /login, coming back here afterwards (see [group]/page.tsx).
  const session = await getSession();
  if (!session) redirect(loginPath("/survey"));
  if (!session.user.division) return <DivisionGuard user={session.user} />;

  const { email, storageBeforeGb, storageAfterGb } = session.user;
  // The completed-sections query only matters while "after" is unanswered — skip it otherwise.
  const needsCompletion = storageAfterGb == null;
  const [questions, alreadyResponded, items, completed] = await Promise.all([
    surveyService.listQuestions(),
    surveyService.hasResponded(email),
    needsCompletion ? listItems() : Promise.resolve([]),
    needsCompletion ? recordService.listCompletedGroupIds(email) : Promise.resolve([]),
  ]);
  // Every section done and the "after" storage not answered yet → the pop-up asks for it (and
  // shows the before/after summary) before the survey.
  const askStorageAfter = needsCompletion && allSectionsDone(items, completed);
  return (
    <SurveyPanel
      questions={questions}
      alreadyResponded={alreadyResponded}
      askStorageAfter={askStorageAfter}
      storageBeforeGb={storageBeforeGb}
    />
  );
}
