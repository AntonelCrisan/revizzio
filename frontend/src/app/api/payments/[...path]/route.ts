const allowedRoutes = new Map([
  ["GET:invoices", "/api/payments/invoices"],
  ["POST:checkout-session", "/api/payments/checkout-session"],
  ["POST:checkout-session/sync", "/api/payments/checkout-session/sync"],
]);

type PaymentsRouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyPaymentsRequest(
  request: Request,
  context: PaymentsRouteContext,
): Promise<Response> {
  const { path } = await context.params;
  const action = path.join("/");
  const backendPath = allowedRoutes.get(`${request.method}:${action}`);

  if (!backendPath) {
    return Response.json(
      { detail: "Ruta de plata nu exista." },
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
  for (const headerName of ["content-type", "cookie", "user-agent"]) {
    const value = request.headers.get(headerName);
    if (value) headers.set(headerName, value);
  }

  try {
    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.text();

    const backendResponse = await fetch(`${apiUrl}${backendPath}`, {
      method: request.method,
      headers,
      body,
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
      { detail: "Serviciul de plata nu este disponibil." },
      { status: 503 },
    );
  }
}

export function POST(
  request: Request,
  context: PaymentsRouteContext,
): Promise<Response> {
  return proxyPaymentsRequest(request, context);
}

export function GET(
  request: Request,
  context: PaymentsRouteContext,
): Promise<Response> {
  return proxyPaymentsRequest(request, context);
}
