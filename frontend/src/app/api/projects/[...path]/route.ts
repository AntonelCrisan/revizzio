const allowedRoutes = [
  { method: "GET", pattern: /^$/ },
  { method: "GET", pattern: /^archived$/ },
  { method: "GET", pattern: /^[0-9a-fA-F-]{36}$/ },
  { method: "GET", pattern: /^[0-9a-fA-F-]{36}\/markdown$/ },
  { method: "GET", pattern: /^[0-9a-fA-F-]{36}\/prompt$/ },
  { method: "PATCH", pattern: /^[0-9a-fA-F-]{36}$/ },
  { method: "POST", pattern: /^prepare$/ },
  { method: "POST", pattern: /^[0-9a-fA-F-]{36}\/archive$/ },
  { method: "POST", pattern: /^[0-9a-fA-F-]{36}\/restore$/ },
  { method: "POST", pattern: /^[0-9a-fA-F-]{36}\/import-json$/ },
  { method: "POST", pattern: /^[0-9a-fA-F-]{36}\/flashcards$/ },
  {
    method: "GET",
    pattern:
      /^[0-9a-fA-F-]{36}\/flashcards\/[0-9a-fA-F-]{36}\/front-image$/,
  },
  {
    method: "POST",
    pattern: /^[0-9a-fA-F-]{36}\/quiz-mistake-flashcards$/,
  },
  { method: "POST", pattern: /^[0-9a-fA-F-]{36}\/summary-highlights$/ },
  {
    method: "PATCH",
    pattern: /^[0-9a-fA-F-]{36}\/summary-highlights\/[0-9a-fA-F-]{36}$/,
  },
  {
    method: "DELETE",
    pattern: /^[0-9a-fA-F-]{36}\/summary-highlights\/[0-9a-fA-F-]{36}$/,
  },
  {
    method: "POST",
    pattern: /^[0-9a-fA-F-]{36}\/quizzes\/[0-9a-fA-F-]{36}\/complete$/,
  },
  { method: "DELETE", pattern: /^[0-9a-fA-F-]{36}$/ },
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

    if (backendResponse.status === 204 || backendResponse.status === 304) {
      return new Response(null, {
        status: backendResponse.status,
        headers: responseHeaders,
      });
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

export function PATCH(
  request: Request,
  context: ProjectsRouteContext,
): Promise<Response> {
  return proxyProjectsRequest(request, context);
}

export function DELETE(
  request: Request,
  context: ProjectsRouteContext,
): Promise<Response> {
  return proxyProjectsRequest(request, context);
}
