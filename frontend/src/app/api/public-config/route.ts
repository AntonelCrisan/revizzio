function readPublicEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || "";
}

export const dynamic = "force-dynamic";

export async function GET() {
  const recaptchaSiteKey =
    readPublicEnv("RECAPTCHA_SITE_KEY") ||
    readPublicEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY");

  return Response.json(
    {
      recaptcha_site_key: recaptchaSiteKey,
      recaptcha_configured: Boolean(recaptchaSiteKey),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
