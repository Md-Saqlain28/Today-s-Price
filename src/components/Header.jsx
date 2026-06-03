import { CircleDollarSign } from "lucide-react";

export function Header() {
  return (
    <header className="top-bar">
      <a className="brand" href="/" aria-label="Today's Price home">
        <span className="brand-mark">
          <CircleDollarSign size={22} aria-hidden="true" />
        </span>
        <span>Today's Price</span>
      </a>

      <span className="live-indicator">
        <span aria-hidden="true" />
        Live
      </span>
    </header>
  );
}
