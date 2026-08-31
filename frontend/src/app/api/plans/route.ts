function getApiUrl() {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL)
    ?.trim()
    .replace(/\/+$/, "");
}

function noStoreHeaders(headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set(
    "Cache-Control",
    "no-store, no-cache, max-age=0, must-revalidate",
  );
  return responseHeaders;
}

export async function GET(request: Request): Promise<Response> {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    return Response.json(
      { detail: "API_URL nu este configurat pe serverul frontend." },
      { status: 500, headers: noStoreHeaders() },
    );
  }

  const requestHeaders = new Headers();
  const userAgent = request.headers.get("user-agent");
  if (userAgent) requestHeaders.set("user-agent", userAgent);

  try {
    const backendResponse = await fetch(`${apiUrl}/api/plans/`, {
      method: "GET",
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
      headers: noStoreHeaders(responseHeaders),
    });
  } catch {
    return Response.json(
      { detail: "Serviciul de planuri nu este disponibil." },
      { status: 503, headers: noStoreHeaders() },
    );
  }
}
