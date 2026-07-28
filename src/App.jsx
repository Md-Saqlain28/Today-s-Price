import { Activity, RefreshCw } from "lucide-react";
import { ASSET_SECTIONS } from "./constants/assets.js";
import { Header } from "./components/Header.jsx";
import { CategorySection } from "./components/CategorySection.jsx";
import { LastUpdatedBadge } from "./components/LastUpdatedBadge.jsx";
import { usePriceData } from "./hooks/usePriceData.js";
import DailyCommodities from "./components/DailyCommodities.jsx";
import { useUserState } from "./hooks/useUserState.js";
import { StateOnboardingModal } from "./components/StateOnboardingModal.jsx";

export default function App() {
  const { selectedState, suggestedState, hasOnboarded, setSelectedState } = useUserState();
  const {
    pricesBySection,
    loadingBySection,
    errorsBySection,
    lastRefreshAt,
    isRefreshing,
    refreshAll,
  } = usePriceData(selectedState?.name);

  return (
    <main className="app-shell">
      {!hasOnboarded && (
        <StateOnboardingModal
          suggestedState={suggestedState}
          onConfirm={setSelectedState}
        />
      )}

      <Header selectedState={selectedState} onStateChange={setSelectedState} />

      <section className="dashboard-toolbar" aria-label="Dashboard controls">
        <div className="toolbar-copy">
          <span className="toolbar-kicker">
            <Activity size={16} aria-hidden="true" />
            Live market monitor
          </span>
          <h1>Today's Price</h1>
          <p>
            A focused price board for crypto, metals, and energy assets with
            category-specific polling.
          </p>
        </div>

        <div className="toolbar-actions">
          <LastUpdatedBadge timestamp={lastRefreshAt} active={isRefreshing} />
          <button className="refresh-button" type="button" onClick={refreshAll}>
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </section>

      <div className="section-stack">
        {ASSET_SECTIONS.map((section) => (
          <CategorySection
            key={section.id}
            section={section}
            prices={pricesBySection[section.id] || []}
            isLoading={loadingBySection[section.id]}
            error={errorsBySection[section.id]}
          />
        ))}
      </div>

      <DailyCommodities stateName={selectedState?.name} />
    </main>
  );
}
