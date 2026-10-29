export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1_000_000) {
    return Response.json({ error: "Chunk too large" }, { status: 413, headers: { "Cache-Control": "no-store" } });
  }
  const body = await request.arrayBuffer();
  return Response.json(
    { receivedBytes: body.byteLength },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
