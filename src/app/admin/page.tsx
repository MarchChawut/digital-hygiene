import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/services/auth.service";
import { listRecords } from "@/services/record.service";
import { listQuestions } from "@/services/survey.service";
import { listItems } from "@/services/checklist.service";
import AdminDashboard from "@/components/AdminDashboard";

// Backoffice route — server-side gate: only the configured admin emails
// (ADMIN_EMAILS) may enter; everyone else is redirected to the main page.
export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    redirect("/");
  }

  const [records, surveyQuestions, checklistItems] = await Promise.all([
    listRecords(),
    listQuestions(),
    listItems(),
  ]);
  return (
    <AdminDashboard
      email={session.user.email}
      initialRecords={records}
      initialSurveyQuestions={surveyQuestions}
      initialChecklistItems={checklistItems}
    />
  );
}
