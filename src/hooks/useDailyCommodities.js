import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAllCommodities,
  searchCommodity,
  clearAllCache,
  DAILY_COMMODITIES,
} from "../services/tavilyService.js";
import { recordMany } from "../utils/priceHistory.js";

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function useDailyCommodities(stateName = "Delhi") {
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
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await fetchAllCommodities(stateName);
      recordMany(results);
      setCommodities(results);
      setLastFetchedAt(new Date().toISOString());
    } catch (err) {
      setError(err.message || "Failed to fetch commodity prices");
    } finally {
      setIsLoading(false);
    }
  }, [stateName]);

  const refresh = useCallback(() => {
    clearAllCache();
    fetchAll();
  }, [fetchAll]);

  const search = useCallback(
    async (query) => {
      if (!query.trim()) return;

      setIsSearching(true);
      setSearchError(null);

      try {
        const result = await searchCommodity(query.trim(), stateName);
        setSearchResults((prev) => [result, ...prev].slice(0, 10));
      } catch (err) {
        setSearchError(err.message || "Search failed");
      } finally {
        setIsSearching(false);
      }
    },
    [stateName]
  );

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
  }, []);

  useEffect(() => {
    clearAllCache();
    fetchAll();

    const timer = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchAll, stateName]);

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

