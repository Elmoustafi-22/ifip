export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return Response.json({ message: "Missing unsubscribe token." }, { status: 400 });
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
  try {
    const response = await fetch(`${apiBase.replace(/\/$/, "")}/marketing/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    const body = await response.text();
    return new Response(body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") || "application/json", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Unable to process unsubscribe request." }, { status: 503 });
  }
}
