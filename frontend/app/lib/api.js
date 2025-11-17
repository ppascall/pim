// Compute API base URL at runtime. In dev, keep relative paths and rely on Next.js rewrites.
// In production (Static Site), set NEXT_PUBLIC_API_BASE to your backend URL
// e.g. https://your-backend.onrender.com
export function apiUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_API_BASE || "";
  const p = String(path || "");
  if (!base) return p; // dev: use relative path
  if (!p) return base;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `${base}${p.startsWith("/") ? p : `/${p}`}`;
}

export function withApiBase(initPath, fallback) {
  const p = apiUrl(initPath);
  return p || fallback || initPath;
}