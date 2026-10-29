import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Viera Speedtest",
  applicationName: "Viera Speedtest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Viera" },
  description: "Measure internet download, upload, latency and jitter using public speed test servers.",
  themeColor: "#080b10",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
