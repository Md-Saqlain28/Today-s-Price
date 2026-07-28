import { useState } from "react";
import { RefreshCw, Search, X, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useDailyCommodities } from "../hooks/useDailyCommodities.js";
import { COMMODITY_CATEGORIES } from "../services/tavilyService.js";
import { Sparkline } from "./Sparkline.jsx";

/** ────────────────────────────────────────────────────────────────
 *  Format helpers
 *  ──────────────────────────────────────────────────────────────── */

function formatINR(value) {
  if (value == null) return "Unavailable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTimestamp(ts) {
  if (!ts) return "Not updated";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

/** ────────────────────────────────────────────────────────────────
 *  Individual commodity card
 *  ──────────────────────────────────────────────────────────────── */

function CommodityCard({ item }) {
  const [showRaw, setShowRaw] = useState(false);

  const isLive = item.status === "live";

  return (
    <article className="dc-card" id={`dc-card-${item.id}`}>
      <div className="dc-card-header">
        {typeof item.icon === "string" && /^https?:\/\//i.test(item.icon) ? (
          <span className="dc-card-icon dc-card-icon-img">
            <img src={item.icon} alt={item.name} loading="lazy" />
          </span>
        ) : (
          <span className="dc-card-icon">{item.icon}</span>
        )}
        <span className={`dc-card-badge ${isLive ? "dc-badge-live" : "dc-badge-unavail"}`}>
          {isLive ? "Live" : "Unavailable"}
        </span>
      </div>

      <div className="dc-card-body">
        <h3 className="dc-card-name">{item.name}</h3>
        <span className="dc-card-symbol">{item.symbol}</span>

        <strong className={`dc-card-price ${isLive ? "" : "dc-price-na"}`}>
          {formatINR(item.price)}
        </strong>

        {item.unit && <span className="dc-card-unit">{item.unit}</span>}

        <Sparkline
          id={item.id}
          tick={item.updatedAt}
          price={item.price}
          change24h={item.change24h}
        />
      </div>

      <div className="dc-card-footer">
        <span className="dc-card-time">{formatTimestamp(item.updatedAt)}</span>
        <span className="dc-card-source">
          {item.source}
          {item.fromCache && <span className="dc-cached-tag">cached</span>}
        </span>
      </div>

      {/* Raw answer toggle — helpful for debugging */}
      {item.raw && (
        <button
          className="dc-raw-toggle"
          onClick={() => setShowRaw((v) => !v)}
          type="button"
        >
          {showRaw ? (
            <><ChevronUp size={14} /> hide raw answer</>
          ) : (
            <><ChevronDown size={14} /> show raw answer</>
          )}
        </button>
      )}

      {showRaw && item.raw && (
        <div className="dc-raw-answer">
          <p>{item.raw}</p>
          {item.sources?.length > 0 && (
            <ul className="dc-sources-list">
              {item.sources.map((s, i) => (
                <li key={i}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={12} /> {s.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

/** ────────────────────────────────────────────────────────────────
 *  Search bar
 *  ──────────────────────────────────────────────────────────────── */

function CommoditySearch({ onSearch, isSearching, searchError, searchResults, onClear }) {
  const [query, setQuery] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  }

  return (
    <div className="dc-search-area" id="dc-search-area">
      <form className="dc-search-form" onSubmit={handleSubmit}>
        <div className="dc-search-input-wrap">
          <Search size={18} className="dc-search-icon" />
          <input
            id="dc-search-input"
            className="dc-search-input"
            type="text"
            placeholder="Search any commodity… e.g. onion, rubber, zinc"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isSearching}
          />
          {query && (
            <button
              type="button"
              className="dc-search-clear"
              onClick={() => { setQuery(""); onClear(); }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="dc-search-btn"
          disabled={isSearching || !query.trim()}
        >
          {isSearching ? "Searching…" : "Search"}
        </button>
      </form>

      {searchError && (
        <div className="dc-search-error" role="status">{searchError}</div>
      )}

      {searchResults.length > 0 && (
        <div className="dc-search-results">
          <div className="dc-search-results-header">
            <h3>Search Results</h3>
            <button className="dc-clear-results" onClick={onClear} type="button">
              Clear all
            </button>
          </div>
          <div className="dc-grid">
            {searchResults.map((item) => (
              <CommodityCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** ────────────────────────────────────────────────────────────────
 *  Main section component
 *  ──────────────────────────────────────────────────────────────── */

export default function DailyCommodities({ stateName }) {
  const {
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
  } = useDailyCommodities(stateName);

  return (
    <section className="dc-section" id="daily-commodities" aria-labelledby="dc-title">
      {/* Section header */}
      <div className="dc-header">
        <div className="dc-header-text">
          <span className="dc-kicker">
            <Search size={16} aria-hidden="true" />
            Tavily-powered search
          </span>
          <h2 id="dc-title">Daily Commodities</h2>
          <p>
            Indian market prices for fuel, construction materials, energy, metals, and agriculture — updated every 6 hours.
          </p>
        </div>

        <div className="dc-header-actions">
          {lastFetchedAt && (
            <span className="dc-last-updated">
              Updated {formatTimestamp(lastFetchedAt)}
            </span>
          )}
          <button
            className="dc-refresh-btn"
            type="button"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? "dc-spin" : ""} />
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="dc-error" role="status">{error}</div>
      )}

      {/* Search bar */}
      <CommoditySearch
        onSearch={search}
        isSearching={isSearching}
        searchError={searchError}
        searchResults={searchResults}
        onClear={clearSearch}
      />

      {/* Category groups */}
      <div className="dc-categories">
        {COMMODITY_CATEGORIES.map((cat) => {
          const items = byCategory[cat.id] || [];
          if (items.length === 0) return null;

          return (
            <div className="dc-category" key={cat.id} id={`dc-cat-${cat.id}`}>
              <h3 className="dc-cat-title">
                <span>{cat.icon}</span> {cat.label}
              </h3>
              <div className="dc-grid">
                {items.map((item) => (
                  <CommodityCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
