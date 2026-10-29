# Viera Speedtest PRO

Viera is a custom Next.js speed-test interface. The site UI can be hosted on Vercel while browser test traffic goes directly to public third-party test infrastructure.

## Current test engine

- The browser loads the LibreSpeed JavaScript engine and worker from this repository's `/public/librespeed/` assets. The worker URL is patched to the bundled same-origin path so it does not accidentally resolve at the site root.
- It fetches the bundled public server list and measures the available servers to select a responsive test point.
- Download, upload, ping, and jitter measurements run in the visitor's browser against the selected public server, not against this Vercel deployment.
- The last 10 results are stored in the current browser's localStorage.
- Public servers are independently operated; availability, speed, and CORS/network reachability can vary by location and over time.

## Deploy to Vercel

1. Import this repository into [Vercel](https://vercel.com/new).
2. Keep the framework preset as Next.js and the default build settings.
3. Deploy, then open the generated URL and test from the browser.

No environment variables are required for the LibreSpeed integration.

## Accuracy and limitations

This is a public-server speed test, not a guarantee of ISP-grade benchmarking. Results depend on the user's connection, browser, selected test server, server load, and route between them. The engine and server list are served from the same origin as Viera, reducing dependency on third-party CDNs for startup. The selected public test servers still need to be reachable and permit cross-origin test requests.

The M-Lab NDT7 engine is a candidate for a second, independent test mode but is not yet wired into the current interface. M-Lab tests use their own measurement methodology and data policy; any integration should clearly explain that before the test starts.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

## Privacy

Test traffic is sent directly from the browser to the selected public LibreSpeed server. The app stores only the last 10 summary results in localStorage on the user's browser. Public server operators may process connection metadata under their own policies. No results database is configured by this app.
