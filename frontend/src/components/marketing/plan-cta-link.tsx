"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";

type PlanCtaLinkProps = {
  isFree: boolean;
  href: string;
  label: string;
  className: string;
  children?: ReactNode;
};

export function PlanCtaLink({
  isFree,
  href,
  label,
  className,
  children,
}: PlanCtaLinkProps) {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !isLoading && Boolean(user);

  const resolvedHref = isFree && isAuthenticated ? "/myaccount" : href;
  const resolvedLabel =
    isFree && isAuthenticated ? "Mergi la contul tău" : label;

  return (
    <Link href={resolvedHref} className={className}>
      {resolvedLabel}
      {children}
    </Link>
  );
}
