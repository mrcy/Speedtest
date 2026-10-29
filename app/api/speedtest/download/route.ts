export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = Number(url.searchParams.get("size") || 1_000_000);
  const size = Number.isFinite(requested) ? Math.max(64 * 1024, Math.min(1_000_000, Math.floor(requested))) : 1_000_000;
  const bytes = new Uint8Array(size);
  // A deterministic, incompressible-enough byte pattern keeps the endpoint lightweight.
  let x = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    bytes[i] = x & 255;
  }
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
