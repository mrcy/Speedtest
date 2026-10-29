# NOVA Speedtest PRO

NOVA is a custom Next.js interface using the open-source LibreSpeed browser engine and a shortlist of community-hosted public test nodes.

## Deploy the interface to Vercel

1. Import this GitHub repository into Vercel: https://vercel.com/new
2. Keep the framework preset as Next.js and the default build settings.
3. Click Deploy.
4. Open the generated Vercel URL and run a test.

No private backend environment variable is required for this community-node setup. Vercel hosts the interface; download/upload traffic goes directly from the browser to the selected public LibreSpeed test node.

## Important accuracy note

The public test nodes are operated by third parties. Availability, geographic proximity, CORS configuration, and server capacity vary. A public node can be unavailable or saturated, so this setup is a low-cost starting point, not a guarantee of ISP-grade measurement accuracy. For dependable public results, deploy and maintain your own high-bandwidth LibreSpeed backend, then add multiple nodes in different regions.

## Features

- Download, upload, browser-based latency, and jitter measurements.
- Selects the reachable test point with the lowest measured latency from the configured shortlist.
- Last 10 results stored in the current browser's localStorage.
- Share result using native share sheet or clipboard.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

## Privacy and traffic

The test sends download and upload traffic directly to the selected public test node. A speed test can consume a noticeable amount of data. History remains in the current browser; this starter does not store test results in a server database.

## References

- LibreSpeed source and documentation: https://github.com/librespeed/speedtest
- Public LibreSpeed server list: https://librespeed.org/backend-servers/servers.php
- Vercel documentation: https://vercel.com/docs
