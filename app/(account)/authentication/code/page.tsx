import type { Metadata } from "next";
import OtpForm from "./OtpForm";

export const metadata: Metadata = {
  title: "Enter code - Lavender Hill Clothing",
};

export default async function CodePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; m?: string; redirect?: string }>;
}) {
  const { email, m, redirect } = await searchParams;
  // `m` carries the marketing-consent choice; `redirect` the post-login return URL.
  return <OtpForm email={email ?? ""} marketing={m !== "0"} redirect={redirect} />;
}
