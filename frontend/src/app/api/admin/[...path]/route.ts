const allowedRoutes = [
  { method: "GET", pattern: /^audit-logs$/ },
  { method: "GET", pattern: /^users$/ },
];

type AdminRouteContext = {
  params: Promise<{ path: string[] }>;
};

function isAllowedRoute(method: string, action: string) {
  return allowedRoutes.some(
    (route) => route.method === method && route.pattern.test(action),
  );
}

async function proxyAdminRequest(
  request: Request,
  context: AdminRouteContext,
): Promise<Response> {
  const { path } = await context.params;
  const action = path.join("/");

  if (!isAllowedRoute(request.method, action)) {
    return Response.json(
      { detail: "Ruta administrativă nu există." },
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

  const requestHeaders = new Headers();
  for (const headerName of ["content-type", "cookie", "user-agent"]) {
    const value = request.headers.get(headerName);
    if (value) requestHeaders.set(headerName, value);
  }

  try {
    const queryString = new URL(request.url).search;
    const backendResponse = await fetch(`${apiUrl}/api/admin/${action}/${queryString}`, {
      method: request.method,
      headers: requestHeaders,
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    const responseContentType = backendResponse.headers.get("content-type");
    if (responseContentType) {
      responseHeaders.set("content-type", responseContentType);
    }

    return new Response(await backendResponse.arrayBuffer(), {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { detail: "Serviciul administrativ nu este disponibil." },
      { status: 503 },
    );
  }
}

export function GET(
  request: Request,
  context: AdminRouteContext,
): Promise<Response> {
  return proxyAdminRequest(request, context);
}
