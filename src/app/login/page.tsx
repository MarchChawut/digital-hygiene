import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/app/session";
import { safeCallbackPath } from "@/lib/safe-redirect";
import { AppTopBar } from "@/components/AppTopBar";
import { AuthErrorToast } from "@/components/AuthErrorToast";
import { SignInGate } from "@/components/SignInGate";

// The one place a signed-out visitor sees the sign-in card. Every section page (and "/")
// redirects here with ?callbackUrl=<where they were going>, so scanning a section's QR
// code still lands on that section after login. Signed in → straight to that section
// (or the first page, /cleanup).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  const target = safeCallbackPath(callbackUrl);

  const session = await getSession();
  if (session) redirect(target);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppTopBar />
      <Suspense fallback={null}>
        <AuthErrorToast />
      </Suspense>
      <SignInGate callbackUrl={target} />
    </div>
  );
}
