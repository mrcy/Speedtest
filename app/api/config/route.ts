import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = process.env.LIBRESPEED_SERVER_URL?.trim() || "";
  const backendUrl = configured
    ? (/^https?:\/\//i.test(configured) ? configured : `https://${configured}`).replace(/\/+$/, "")
    : "";
  return NextResponse.json({ backendUrl }, {
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}
