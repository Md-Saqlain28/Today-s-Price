export const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL || "";
export const GOLD_API_KEY = import.meta.env.VITE_GOLD_API_KEY || "";
export const EIA_API_KEY = import.meta.env.VITE_EIA_API_KEY || "";

export function buildProxyUrl(path) {
  if (!PROXY_BASE_URL) {
    return "";
  }

  return `${PROXY_BASE_URL.replace(/\/$/, "")}${path}`;
}
