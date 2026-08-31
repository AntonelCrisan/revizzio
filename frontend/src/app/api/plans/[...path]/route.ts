const allowedRoutes = [
  { method: "GET", pattern: /^admin$/ },
  { method: "PUT", pattern: /^admin$/ },
];

function noStoreHeaders(headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set(
    "Cache-Control",
    "no-store, no-cache, max-age=0, must-revalidate",
  );
  return responseHeaders;
}

type PlansRouteContext = {
  params: Promise<{ path: string[] }>;
};

function isAllowedRoute(method: string, action: string) {
  return allowedRoutes.some(
    (route) => route.method === method && route.pattern.test(action),
  );
}

async function proxyPlansRequest(
  request: Request,
  context: PlansRouteContext,
): Promise<Response> {
  const { path } = await context.params;
  const action = path.join("/");

  if (!isAllowedRoute(request.method, action)) {
    return Response.json(
      { detail: "Ruta pentru planuri nu exista." },
      { status: 404, headers: noStoreHeaders() },
    );
  }

  const apiUrl = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL)
    ?.trim()
    .replace(/\/+$/, "");
  if (!apiUrl) {
    return Response.json(
      { detail: "API_URL nu este configurat pe serverul frontend." },
      { status: 500, headers: noStoreHeaders() },
    );
  }

  const requestHeaders = new Headers();
  for (const headerName of ["content-type", "cookie", "user-agent"]) {
    const value = request.headers.get(headerName);
    if (value) requestHeaders.set(headerName, value);
  }

  try {
    const backendResponse = await fetch(`${apiUrl}/api/plans/${action}`, {
      method: request.method,
      headers: requestHeaders,
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    const responseContentType = backendResponse.headers.get("content-type");
    if (responseContentType) {
      responseHeaders.set("content-type", responseContentType);
    }

    return new Response(await backendResponse.arrayBuffer(), {
      status: backendResponse.status,
      headers: noStoreHeaders(responseHeaders),
    });
  } catch {
    return Response.json(
      { detail: "Serviciul de planuri nu este disponibil." },
      { status: 503, headers: noStoreHeaders() },
    );
  }
}

export function GET(
  request: Request,
  context: PlansRouteContext,
): Promise<Response> {
  return proxyPlansRequest(request, context);
}

export function PUT(
  request: Request,
  context: PlansRouteContext,
): Promise<Response> {
  return proxyPlansRequest(request, context);
}
