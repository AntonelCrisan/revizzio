import type { CompanyData } from "@/lib/legal-api";

export function FacebookLogo() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

export function InstagramLogo() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokLogo() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 3c.42 2.1 1.77 3.63 3.8 3.96v3.02a7.1 7.1 0 0 1-3.8-1.1v6.02a5.55 5.55 0 1 1-5.55-5.55c.3 0 .6.02.9.07v3.1a2.42 2.42 0 1 0 1.71 2.31V3h2.94Z" />
    </svg>
  );
}

export function LinkedInLogo() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3a1.94 1.94 0 1 0 0 3.88 1.94 1.94 0 0 0 0-3.88ZM20.45 20h-3.37v-5.6c0-1.34-.03-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.97V20H9.68V8.5h3.24v1.57h.05c.45-.85 1.55-1.75 3.2-1.75 3.43 0 4.06 2.26 4.06 5.2V20Z" />
    </svg>
  );
}

export function YouTubeLogo() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 8.5 16 12l-6 3.5V8.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function XLogo() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" d="M4 4l16 16M20 4 4 20" />
    </svg>
  );
}

export const socialPlatforms: Array<{
  key: keyof CompanyData;
  label: string;
  Icon: () => React.JSX.Element;
}> = [
  { key: "social_facebook_url", label: "Facebook", Icon: FacebookLogo },
  { key: "social_instagram_url", label: "Instagram", Icon: InstagramLogo },
  { key: "social_tiktok_url", label: "TikTok", Icon: TikTokLogo },
  { key: "social_linkedin_url", label: "LinkedIn", Icon: LinkedInLogo },
  { key: "social_youtube_url", label: "YouTube", Icon: YouTubeLogo },
  { key: "social_x_url", label: "X (Twitter)", Icon: XLogo },
];
