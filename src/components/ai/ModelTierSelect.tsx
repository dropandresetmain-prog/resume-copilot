"use client";

import { formFieldClassName, labelClassName } from "@/components/setup/ui";
import { MODEL_TIER_LABELS, MODEL_TIERS, type ModelTier } from "@/lib/ai/model-tiers";

type ModelTierSelectProps = {
  id: string;
  label: string;
  value: ModelTier;
  disabled?: boolean;
  onChange: (tier: ModelTier) => void;
};

export function ModelTierSelect({
  id,
  label,
  value,
  disabled = false,
  onChange,
}: ModelTierSelectProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <select
        id={id}
        className={formFieldClassName}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as ModelTier)}
      >
        {MODEL_TIERS.map((tier) => (
          <option key={tier} value={tier}>
            {MODEL_TIER_LABELS[tier].label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-slate-500">{MODEL_TIER_LABELS[value].hint}</p>
    </div>
  );
}
