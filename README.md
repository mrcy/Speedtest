# NOVA Speedtest PRO

A custom Next.js interface powered by the open-source LibreSpeed engine. The UI and test node are separate so the test backend can later be moved to a faster VPS or expanded to multiple regions.

## Deploy free for a first trial

This repository includes a Render Blueprint (render.yaml) that creates:
- nova-speedtest: the NOVA interface.
- nova-speedtest-backend: a LibreSpeed test node running in Docker.

1. Push this repository to GitHub.
2. Open the Render Blueprint deploy page: https://render.com/deploy
3. Deploy this repository and wait for both services to finish deploying.
4. Open the nova-speedtest service URL and run a test.

The interface reads the backend hostname from LIBRESPEED_SERVER_URL at runtime. The blueprint connects it to the backend service automatically.

## Important accuracy note

Render free web services can sleep after inactivity and take around a minute to wake up. That can make the first test fail or feel slow. Free hosting is useful for validating the app, but it is not a reliable high-performance public speed-test node. For accurate, repeatable results, move the LibreSpeed backend to a VPS with a strong network connection and enough bandwidth. The backend's network capacity directly affects the maximum measured speed.

## Run locally

Requires Node.js 22 or newer.

    npm install
    npm run dev

Open http://localhost:3000. To run tests locally, deploy a LibreSpeed backend and set LIBRESPEED_SERVER_URL to its HTTPS hostname or URL.

## Architecture

- Frontend: Next.js, deployed as a Node web service.
- Engine: LibreSpeed browser worker loaded from jsDelivr.
- Test node: official LibreSpeed Docker image, standalone mode.
- Test history: last 10 results stored in the current browser's localStorage only.

LibreSpeed adds cors=true to its test requests, which enables cross-origin requests on its backend endpoints. Keep the backend on HTTPS when the frontend is HTTPS.

## Privacy and traffic

The test sends download and upload traffic to the configured LibreSpeed node. A speed test can use a noticeable amount of data. This starter does not save test results to a server database; history remains in the current browser.

## References

- LibreSpeed: https://github.com/librespeed/speedtest
- LibreSpeed Docker docs: https://github.com/librespeed/speedtest/blob/master/doc_docker.md
- Render free service limitations: https://render.com/docs/free
