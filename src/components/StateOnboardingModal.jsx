import { MapPin } from "lucide-react";
import { STATES_AND_UTS } from "../constants/states.js";

export function StateOnboardingModal({ suggestedState, onConfirm }) {
  const fallback = suggestedState || STATES_AND_UTS.find((state) => state.id === "delhi") || STATES_AND_UTS[0];

  return (
    <div className="state-modal-backdrop" role="presentation">
      <div className="state-modal" role="dialog" aria-modal="true" aria-labelledby="state-modal-title">
        <span className="state-modal-kicker">
          <MapPin size={14} aria-hidden="true" />
          Location setup
        </span>
        <h2 id="state-modal-title">Choose your state</h2>
        <p>
          We use your state to tailor commodity prices like fuel and agriculture.
          You can change it later anytime.
        </p>
        <label className="state-modal-field">
          <span>State</span>
          <select
            defaultValue={fallback.id}
            onChange={(e) => {
              const next = STATES_AND_UTS.find((state) => state.id === e.target.value);
              if (next) onConfirm(next);
            }}
          >
            {STATES_AND_UTS.map((state) => (
              <option key={state.id} value={state.id}>
                {state.name}
              </option>
            ))}
          </select>
        </label>
        <div className="state-modal-actions">
          <button
            type="button"
            className="state-modal-primary"
            onClick={() => onConfirm(fallback)}
          >
            Use {fallback.name}
          </button>
        </div>
      </div>
    </div>
  );
}

