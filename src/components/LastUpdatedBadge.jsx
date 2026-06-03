import { Clock } from "lucide-react";

export function LastUpdatedBadge({ timestamp, active }) {
  const label = timestamp
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(timestamp))
    : "Pending";

  return (
    <span className={active ? "updated-badge is-active" : "updated-badge"}>
      <Clock size={16} aria-hidden="true" />
      {active ? "Updating" : `Updated ${label}`}
    </span>
  );
}
