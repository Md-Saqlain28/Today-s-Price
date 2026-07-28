import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_STATE,
  ONBOARDING_STORAGE_KEY,
  STATE_STORAGE_KEY,
  STATES_AND_UTS,
  getStateById,
} from "../constants/states.js";

function readStoredState() {
  try {
    return localStorage.getItem(STATE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function readStoredOnboarding() {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

async function detectStateFromIp() {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) return null;
    const data = await response.json();
    const region = String(data?.region || data?.city || "").trim();
    if (!region) return null;
    const match = STATES_AND_UTS.find(
      (state) => state.name.toLowerCase() === region.toLowerCase()
    );
    return match || null;
  } catch {
    return null;
  }
}

export function useUserState() {
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE);
  const [suggestedState, setSuggestedState] = useState(null);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    const storedId = readStoredState();
    const storedState = storedId ? getStateById(storedId) : null;
    if (storedState) {
      setSelectedState(storedState);
    }
    setHasOnboarded(readStoredOnboarding() || Boolean(storedState));

    if (!storedState) {
      detectStateFromIp().then((detected) => {
        if (detected) setSuggestedState(detected);
      });
    }
  }, []);

  const confirmState = useCallback((nextState) => {
    if (!nextState) return;
    setSelectedState(nextState);
    setSuggestedState(nextState);
    setHasOnboarded(true);
    try {
      localStorage.setItem(STATE_STORAGE_KEY, nextState.id);
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {
      // ignore storage failures
    }
  }, []);

  const value = useMemo(
    () => ({
      selectedState,
      suggestedState,
      hasOnboarded,
      setSelectedState: confirmState,
    }),
    [confirmState, hasOnboarded, selectedState, suggestedState]
  );

  return value;
}

