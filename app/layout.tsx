import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOVA Speedtest PRO",
  description: "Measure internet download, upload, latency and jitter against Cloudflare's network.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
