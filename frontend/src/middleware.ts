import { NextRequest, NextResponse } from "next/server";

type AuthUserRolePayload = {
  role?: unknown;
};

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    return redirectToLogin(request);
  }

  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  const userAgent = request.headers.get("user-agent");

  if (cookie) {
    headers.set("cookie", cookie);
  }

  if (userAgent) {
    headers.set("user-agent", userAgent);
  }

  try {
    const response = await fetch(`${apiUrl}/api/auth/me`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (response.status === 401) {
      return redirectToLogin(request);
    }

    if (!response.ok) {
      return NextResponse.redirect(new URL("/myaccount", request.url));
    }

    const user = (await response.json()) as AuthUserRolePayload;

    if (user.role !== "admin") {
      return NextResponse.redirect(new URL("/myaccount", request.url));
    }

    return NextResponse.next();
  } catch {
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: "/admin/:path*",
};
