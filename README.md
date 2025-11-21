## PIM Full-Stack App

This repository bundles the Flask backend (CSV-based PIM API) and the Next.js frontend (admin dashboard). You can run both layers locally via Docker or deploy them as a single container on Railway using the provided `Dockerfile` + `start.sh` entrypoint.

### Local smoke test

```powershell
docker build -t pim-full .
docker run --rm -p 8080:8080 pim-full
```

Then open <http://localhost:8080>. All `/api/*` requests are reverse-proxied to the Flask service running inside the same container.

### Railway deployment (single service)

1. Create a **new Service** in Railway and choose **Deploy from Repository** pointing to this repo.
2. When prompted for the deploy method, pick **Dockerfile** (Railway will autodetect the root `Dockerfile`). No Build or Start command overrides are required—the default `CMD ["bash", "./start.sh"]` starts gunicorn + Next.js.
3. Set the following environment variables on the service:
	- `PORT=8080` (Railway injects one automatically; keeping it explicit avoids confusion).
	- `PIM_DATA_DIR=/data` (already the default, but you can mount a persistent volume to `/data` if desired).
	- **Optional:** `NEXT_PUBLIC_API_BASE` (leave empty for single-container deploys; set to your backend URL if you later split frontend/backed services).
4. (Optional) Attach a persistent volume at `/data` if you want CSV files to survive restarts. Otherwise, the app falls back to the repository CSVs baked into the image.
5. Redeploy. Railway logs should show:
	- `Starting backend with gunicorn on 127.0.0.1:5000`
	- `Starting Next.js on 0.0.0.0:$PORT`
	- `Ready in <x> ms`
6. Once the build finishes, open the published Railway domain. The frontend is served from `/` and proxies `/api/*` requests internally to the gunicorn process.

If you later split the stack into separate services:

- Keep the existing backend Dockerfile under `backend/` and deploy it as a Python service (gunicorn binding to `0.0.0.0:$PORT`).
- Deploy the Next.js app via the Railway Static Sites product. Set `NEXT_PUBLIC_API_BASE` there to the backend’s public URL (e.g., `https://your-backend.up.railway.app`).
- The frontend rewrites `/api/*` only in dev, so providing `NEXT_PUBLIC_API_BASE` is mandatory when the services live on different hosts.

### Useful health checks

- Backend (proxied through Next.js): `GET https://<your-domain>/api/health`
- Backend direct (when running backend-only container): `GET http://localhost:5000/health`

Both respond with `{ "status": "ok" }` when the app is healthy.
