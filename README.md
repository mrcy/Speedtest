# NOVA Speedtest PRO

A Next.js browser-based internet speed test starter using Cloudflare's official `@cloudflare/speedtest` library.

## Run locally
Requires Node.js 20.9+ (Node 22 recommended).

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy
This project is intended for deployment on Cloudflare's supported Next.js platform. Check the current official guide before deploying:
https://developers.cloudflare.com/workers/frameworks/framework-guides/nextjs/

## Notes
- Measurements run in the browser against Cloudflare's edge network, not a server owned by this project.
- The last 10 test results are stored in localStorage in the current browser only.
- A browser speed test can consume a substantial amount of data.
- Verify measurement behavior, privacy disclosures, and production build before public launch.

Engine: https://github.com/cloudflare/speedtest
