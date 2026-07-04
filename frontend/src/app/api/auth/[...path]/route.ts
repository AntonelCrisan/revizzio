const allowedRoutes = new Map([
  ["GET:me", "/api/auth/me"],
  ["PATCH:me/preferences", "/api/auth/me/preferences"],
  ["POST:login", "/api/auth/login"],
  ["POST:logout", "/api/auth/logout"],
  ["POST:password-reset/confirm", "/api/auth/password-reset/confirm"],
  ["POST:password-reset/request", "/api/auth/password-reset/request"],
  ["POST:register", "/api/auth/register"],
  ["POST:verify-email", "/api/auth/verify-email"],
]);

type AuthRouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyAuthRequest(
  request: Request,
  context: AuthRouteContext,
): Promise<Response> {
  const { path } = await context.params;
  const action = path.join("/");
  const backendPath = allowedRoutes.get(`${request.method}:${action}`);

  if (!backendPath) {
    return Response.json(
      { detail: "Ruta de autentificare nu există." },
      { status: 404 },
    );
  }

  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return Response.json(
      { detail: "API_URL nu este configurat pe serverul frontend." },
      { status: 500 },
    );
  }

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const cookie = request.headers.get("cookie");
  const userAgent = request.headers.get("user-agent");

  if (contentType) headers.set("content-type", contentType);
  if (cookie) headers.set("cookie", cookie);
  if (userAgent) headers.set("user-agent", userAgent);

  try {
    const backendResponse = await fetch(`${apiUrl}${backendPath}`, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    const responseContentType = backendResponse.headers.get("content-type");
    if (responseContentType) {
      responseHeaders.set("content-type", responseContentType);
    }

    const setCookies = backendResponse.headers.getSetCookie();
    for (const setCookie of setCookies) {
      responseHeaders.append("set-cookie", setCookie);
    }

    return new Response(await backendResponse.arrayBuffer(), {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { detail: "Serviciul de autentificare nu este disponibil." },
      { status: 503 },
    );
  }
}

export function GET(
  request: Request,
  context: AuthRouteContext,
): Promise<Response> {
  return proxyAuthRequest(request, context);
}

export function POST(
  request: Request,
  context: AuthRouteContext,
): Promise<Response> {
  return proxyAuthRequest(request, context);
}

export function PATCH(
  request: Request,
  context: AuthRouteContext,
): Promise<Response> {
  return proxyAuthRequest(request, context);
}
