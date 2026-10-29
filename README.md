# NOVA Speedtest PRO

NOVA is a custom Next.js speed-test interface hosted on Vercel. The browser sends test traffic to the application's own Vercel-hosted API routes; it does not use public LibreSpeed nodes or load a third-party test engine.

## Deploy to Vercel

1. Import this repository into [Vercel](https://vercel.com/new).
2. Keep the framework preset as Next.js and the default build settings.
3. Deploy, then open the generated Vercel URL and run a test.

No environment variables are required.

## How this test works

- Ping and jitter are estimated by making uncached requests to the app's own Vercel endpoint.
- Download is estimated by repeatedly downloading small generated binary chunks from a Vercel Function.
- Upload is estimated by repeatedly posting small binary chunks to a Vercel Function.
- The last 10 results are stored in the current browser's localStorage.

## Important accuracy and platform limits

This is a lightweight, self-hosted-on-Vercel prototype, not an ISP-grade speed test. Measurements include serverless function startup, execution, region, and platform overhead, so they may differ significantly from the user's actual line speed. Vercel Functions have request/response payload limits and plan-dependent execution limits; this implementation intentionally uses small chunks. Repeated tests consume function invocations and bandwidth. Do not treat the results as a benchmark for very fast connections or heavy public traffic.

For accurate high-throughput testing and larger upload/download transfers, use a dedicated high-bandwidth LibreSpeed server or VPS. The website UI can remain on Vercel.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

## Privacy

The test transfers temporary binary data between the browser and this application's Vercel endpoints. The app does not save the transferred payload or send test results to a database. Local history stays in the current browser.
