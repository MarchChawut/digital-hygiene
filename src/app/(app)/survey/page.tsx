import { redirect } from "next/navigation";
import { getSession } from "@/app/session";
import * as surveyService from "@/services/survey.service";
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

  const [questions, alreadyResponded] = await Promise.all([
    surveyService.listQuestions(),
    surveyService.hasResponded(session.user.email),
  ]);
  return <SurveyPanel questions={questions} alreadyResponded={alreadyResponded} />;
}
