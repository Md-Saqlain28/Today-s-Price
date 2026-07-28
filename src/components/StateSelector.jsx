import { MapPin } from "lucide-react";
import { STATES_AND_UTS } from "../constants/states.js";

export function StateSelector({ value, onChange }) {
  return (
    <label className="state-selector">
      <span className="state-selector-label">
        <MapPin size={14} aria-hidden="true" />
        State
      </span>
      <select
        className="state-selector-input"
        value={value?.id || ""}
        onChange={(e) => {
          const next = STATES_AND_UTS.find((state) => state.id === e.target.value);
          if (next) onChange(next);
        }}
      >
        {STATES_AND_UTS.map((state) => (
          <option key={state.id} value={state.id}>
            {state.name}
          </option>
        ))}
      </select>
    </label>
  );
}

