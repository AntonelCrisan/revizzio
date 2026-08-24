function getApiUrl() {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL)
    ?.trim()
    .replace(/\/+$/, "");
}

export async function GET(request: Request): Promise<Response> {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    return Response.json(
      { detail: "API_URL nu este configurat pe serverul frontend." },
      { status: 500 },
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
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { detail: "Serviciul de planuri nu este disponibil." },
      { status: 503 },
    );
  }
}
