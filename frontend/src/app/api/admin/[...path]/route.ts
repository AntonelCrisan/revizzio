const allowedRoutes = [
  { method: "GET", pattern: /^audit-logs$/ },
  { method: "GET", pattern: /^contact-messages$/ },
  { method: "GET", pattern: /^content-reports$/ },
  { method: "GET", pattern: /^withdrawal-requests$/ },
  {
    method: "GET",
    pattern: /^content-reports\/[^/]+\/attachments\/[^/]+\/download$/,
  },
  { method: "GET", pattern: /^users$/ },
  { method: "POST", pattern: /^users\/[^/]+\/verification-email$/ },
  { method: "PATCH", pattern: /^users\/[^/]+$/ },
  { method: "DELETE", pattern: /^users\/[^/]+$/ },
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
    const requestBody =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer();
    const backendResponse = await fetch(
      `${apiUrl}/api/admin/${action}/${queryString}`,
      {
        method: request.method,
        headers: requestHeaders,
        body: requestBody,
        cache: "no-store",
      },
    );

    const responseHeaders = new Headers();
    for (const headerName of [
      "cache-control",
      "content-disposition",
      "content-length",
      "content-type",
    ]) {
      const value = backendResponse.headers.get(headerName);
      if (value) responseHeaders.set(headerName, value);
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

export function POST(
  request: Request,
  context: AdminRouteContext,
): Promise<Response> {
  return proxyAdminRequest(request, context);
}

export function PATCH(
  request: Request,
  context: AdminRouteContext,
): Promise<Response> {
  return proxyAdminRequest(request, context);
}

export function DELETE(
  request: Request,
  context: AdminRouteContext,
): Promise<Response> {
  return proxyAdminRequest(request, context);
}
