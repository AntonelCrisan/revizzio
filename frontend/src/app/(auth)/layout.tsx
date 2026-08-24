import type { Metadata } from "next";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-svh items-center overflow-x-hidden bg-app px-2 py-4 text-content sm:px-4 md:px-5 lg:px-8">
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-warning-border/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[28rem] w-[28rem] rounded-full bg-success-border/20 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl items-center">
        {children}
      </div>
    </main>
  );
}
