import { useCallback, useEffect, useMemo, useState } from "react";
import { ASSET_SECTIONS, POLLING_INTERVALS } from "../constants/assets.js";
import { fetchSectionPrices } from "../services/priceService.js";
import { recordMany } from "../utils/priceHistory.js";

const initialPrices = ASSET_SECTIONS.reduce((acc, section) => {
  acc[section.id] = section.assets.map((asset) => ({
    ...asset,
    category: section.id,
    price: null,
    change24h: null,
    updatedAt: null,
    source: "Pending",
    status: "loading",
  }));
  return acc;
}, {});

export function usePriceData(stateName = "Delhi") {
  const [pricesBySection, setPricesBySection] = useState(initialPrices);
  const [loadingBySection, setLoadingBySection] = useState(
    ASSET_SECTIONS.reduce((acc, section) => ({ ...acc, [section.id]: true }), {})
  );
  const [errorsBySection, setErrorsBySection] = useState({});
  const [lastRefreshAt, setLastRefreshAt] = useState(null);

  const refreshSection = useCallback(async (sectionId) => {
    setLoadingBySection((current) => ({ ...current, [sectionId]: true }));

    try {
      const prices = await fetchSectionPrices(sectionId, stateName);
      recordMany(prices);
      setPricesBySection((current) => ({ ...current, [sectionId]: prices }));
      setErrorsBySection((current) => ({ ...current, [sectionId]: null }));
      setLastRefreshAt(new Date().toISOString());
    } catch (error) {
      setErrorsBySection((current) => ({
        ...current,
        [sectionId]: error.message || "Price request failed",
      }));
    } finally {
      setLoadingBySection((current) => ({ ...current, [sectionId]: false }));
    }
  }, [stateName]);

  const refreshAll = useCallback(() => {
    ASSET_SECTIONS.forEach((section) => {
      refreshSection(section.id);
    });
  }, [refreshSection]);

  useEffect(() => {
    refreshAll();

    const timers = ASSET_SECTIONS.map((section) =>
      window.setInterval(
        () => refreshSection(section.id),
        POLLING_INTERVALS[section.id]
      )
    );

    return () => {
      timers.forEach((timer) => window.clearInterval(timer));
    };
  }, [refreshAll, refreshSection, stateName]);

  const isRefreshing = useMemo(
    () => Object.values(loadingBySection).some(Boolean),
    [loadingBySection]
  );

  return {
    pricesBySection,
    loadingBySection,
    errorsBySection,
    lastRefreshAt,
    isRefreshing,
    refreshAll,
  };
}
