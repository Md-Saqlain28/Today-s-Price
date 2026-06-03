import { AlertCircle } from "lucide-react";
import { PriceCard } from "./PriceCard.jsx";

export function CategorySection({ section, prices, isLoading, error }) {
  return (
    <section className="category-section" aria-labelledby={`${section.id}-title`}>
      <div className="section-heading">
        <div>
          <h2 id={`${section.id}-title`}>{section.title}</h2>
          <p>{section.description}</p>
        </div>
        {isLoading && <span className="section-status">Updating</span>}
      </div>

      {error && (
        <div className="error-banner" role="status">
          <AlertCircle size={17} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="price-grid">
        {prices.map((price) => (
          <PriceCard key={price.id} price={price} />
        ))}
      </div>
    </section>
  );
}
