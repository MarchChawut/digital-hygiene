import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/services/auth.service";
import { listRecords } from "@/services/record.service";
import { listQuestions, listResponses } from "@/services/survey.service";
import { listItems } from "@/services/checklist.service";
import { listAuditLog } from "@/services/audit.service";
import { loginPath } from "@/lib/safe-redirect";
import AdminDashboard from "@/components/AdminDashboard";

// Backoffice route — server-side gate: only the configured admin emails
// (ADMIN_EMAILS) may enter. Signed out → /login (and back here afterwards);
// signed in but not an admin → the main page.
export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect(loginPath("/admin"));
  if (!isAdmin(session.user.email)) redirect("/");

  const [records, surveyQuestions, surveyResponses, checklistItems, auditLog] = await Promise.all([
    listRecords(),
    listQuestions(),
    listResponses(),
    listItems(),
    listAuditLog(),
  ]);
  return (
    <AdminDashboard
      email={session.user.email}
      initialRecords={records}
      initialSurveyQuestions={[...surveyQuestions]}
      initialSurveyResponses={surveyResponses}
      initialChecklistItems={[...checklistItems]}
      initialAuditLog={auditLog}
    />
  );
}
