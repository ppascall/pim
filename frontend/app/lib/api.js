// Compute API base URL at runtime. In dev, keep relative paths and rely on Next.js rewrites.
// In production (Static Site), set NEXT_PUBLIC_API_BASE to your backend URL
// e.g. https://your-backend.onrender.com

const LOCALHOST_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

function normalizeBase(base) {
  const trimmed = (base || "").trim();
  if (!trimmed) return "";

  if (typeof window !== "undefined") {
    const baseLooksLocal = LOCALHOST_REGEX.test(trimmed);
    const pageIsLocal = LOCALHOST_REGEX.test(window?.location?.origin || "");
    if (baseLooksLocal && !pageIsLocal) {
      console.warn(
        "[apiUrl] NEXT_PUBLIC_API_BASE points to localhost, but the page is served from",
        window.location.origin,
        "— falling back to relative /api paths."
      );
      return "";
    }
  }

  return trimmed.replace(/\/$/, "");
}

function normalizePath(path) {
  const p = `${path || ""}`;
  if (!p) return "";
  if (p.startsWith("/")) return p;
  return `/${p}`;
}

export function apiUrl(path = "") {
  const base = normalizeBase(process.env.NEXT_PUBLIC_API_BASE);
  const raw = `${path || ""}`;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const normalizedPath = normalizePath(raw);

  if (!base) return normalizedPath || "/";
  if (!normalizedPath) return base;
  return `${base}${normalizedPath}`;
}

export function withApiBase(initPath, fallback) {
  const p = apiUrl(initPath);
  return p || fallback || initPath;
}