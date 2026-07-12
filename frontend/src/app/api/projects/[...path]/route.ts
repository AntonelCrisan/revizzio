const allowedRoutes = [
  { method: "GET", pattern: /^$/ },
  { method: "GET", pattern: /^[0-9a-fA-F-]{36}$/ },
  { method: "GET", pattern: /^[0-9a-fA-F-]{36}\/markdown$/ },
  { method: "GET", pattern: /^[0-9a-fA-F-]{36}\/prompt$/ },
  { method: "POST", pattern: /^prepare$/ },
  { method: "POST", pattern: /^[0-9a-fA-F-]{36}\/import-json$/ },
  {
    method: "POST",
    pattern: /^[0-9a-fA-F-]{36}\/quiz-mistake-flashcards$/,
  },
];

type ProjectsRouteContext = {
  params: Promise<{ path: string[] }>;
};

function isAllowedRoute(method: string, action: string) {
  return allowedRoutes.some(
    (route) => route.method === method && route.pattern.test(action),
  );
}

async function proxyProjectsRequest(
  request: Request,
  context: ProjectsRouteContext,
): Promise<Response> {
  const { path } = await context.params;
  const action = path.join("/");

  if (!isAllowedRoute(request.method, action)) {
    return Response.json(
      { detail: "Ruta pentru proiecte nu exista." },
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
    const queryString = new URL(request.url).search;
    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer();

    const backendResponse = await fetch(
      `${apiUrl}/api/projects/${action}${queryString}`,
      {
        method: request.method,
        headers,
        body,
        cache: "no-store",
      },
    );

    const responseHeaders = new Headers();
    for (const headerName of ["content-type", "content-disposition"]) {
      const value = backendResponse.headers.get(headerName);
      if (value) responseHeaders.set(headerName, value);
    }

    return new Response(await backendResponse.arrayBuffer(), {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { detail: "Serviciul de proiecte nu este disponibil." },
      { status: 503 },
    );
  }
}

export function GET(
  request: Request,
  context: ProjectsRouteContext,
): Promise<Response> {
  return proxyProjectsRequest(request, context);
}

export function POST(
  request: Request,
  context: ProjectsRouteContext,
): Promise<Response> {
  return proxyProjectsRequest(request, context);
}
