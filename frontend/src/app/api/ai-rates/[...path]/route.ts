const allowedRoutes = [
  { method: "GET", pattern: /^credits$/ },
  { method: "PUT", pattern: /^credits$/ },
  { method: "GET", pattern: /^models$/ },
  { method: "PUT", pattern: /^models$/ },
];

type AiRatesRouteContext = {
  params: Promise<{ path: string[] }>;
};

function isAllowedRoute(method: string, action: string) {
  return allowedRoutes.some(
    (route) => route.method === method && route.pattern.test(action),
  );
}

async function proxyAiRatesRequest(
  request: Request,
  context: AiRatesRouteContext,
): Promise<Response> {
  const { path } = await context.params;
  const action = path.join("/");

  if (!isAllowedRoute(request.method, action)) {
    return Response.json(
      { detail: "Ruta pentru ratele AI nu exista." },
      { status: 404 },
    );
  }

  const apiUrl = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL)
    ?.trim()
    .replace(/\/+$/, "");
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
    const backendResponse = await fetch(`${apiUrl}/api/ai-rates/${action}`, {
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
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { detail: "Serviciul de rate AI nu este disponibil." },
      { status: 503 },
    );
  }
}

export function GET(
  request: Request,
  context: AiRatesRouteContext,
): Promise<Response> {
  return proxyAiRatesRequest(request, context);
}

export function PUT(
  request: Request,
  context: AiRatesRouteContext,
): Promise<Response> {
  return proxyAiRatesRequest(request, context);
}
