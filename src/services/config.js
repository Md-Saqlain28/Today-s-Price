export const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL || "";

export function buildProxyUrl(path) {
  if (!PROXY_BASE_URL) {
    return "";
  }

  return `${PROXY_BASE_URL.replace(/\/$/, "")}${path}`;
}
