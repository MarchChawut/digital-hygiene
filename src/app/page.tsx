import { redirect } from "next/navigation";
import { getSession } from "@/app/session";
import { HOME_PATH, loginPath } from "@/lib/safe-redirect";

// "/" has no content of its own: signed in → the first page (/cleanup); signed out →
// /login. (Auth.js now reports failed sign-ins at /login?error=…, but forward a stray
// ?error= here too so it isn't lost.)
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await getSession();
  redirect(session ? HOME_PATH : loginPath(undefined, error));
}
