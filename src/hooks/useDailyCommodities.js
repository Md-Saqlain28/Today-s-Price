import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAllCommodities,
  searchCommodity,
  clearAllCache,
  DAILY_COMMODITIES,
} from "../services/tavilyService.js";

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * React hook for daily Indian commodity prices via Tavily.
 *
 * Returns commodities data grouped by category, loading/error state,
 * a refresh function, and a search function for arbitrary queries.
 */
export function useDailyCommodities() {
  const [commodities, setCommodities] = useState(() =>
    DAILY_COMMODITIES.map((c) => ({
      ...c,
      price: null,
      answer: null,
      raw: null,
      sources: [],
      updatedAt: null,
      source: "Pending",
      status: "loading",
      fromCache: false,
    }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  // ── Search state ──────────────────────────────────────────────
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // ── Fetch all commodities ─────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await fetchAllCommodities();
      setCommodities(results);
      setLastFetchedAt(new Date().toISOString());
    } catch (err) {
      setError(err.message || "Failed to fetch commodity prices");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Force refresh (clears cache) ─────────────────────────────
  const refresh = useCallback(() => {
    clearAllCache();
    fetchAll();
  }, [fetchAll]);

  // ── Search for an arbitrary commodity ─────────────────────────
  const search = useCallback(async (query) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await searchCommodity(query.trim());
      setSearchResults((prev) => [result, ...prev].slice(0, 10));
    } catch (err) {
      setSearchError(err.message || "Search failed");
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
  }, []);

  // ── Initial fetch + auto-refresh interval ─────────────────────
  useEffect(() => {
    fetchAll();

    const timer = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchAll]);

  // ── Group by category ─────────────────────────────────────────
  const byCategory = useMemo(() => {
    const map = {};
    for (const c of commodities) {
      if (!map[c.category]) map[c.category] = [];
      map[c.category].push(c);
    }
    return map;
  }, [commodities]);

  return {
    commodities,
    byCategory,
    isLoading,
    error,
    lastFetchedAt,
    refresh,
    search,
    searchResults,
    isSearching,
    searchError,
    clearSearch,
  };
}
