import React from "react";

export default function Checkbox({ checked, onChange, label, ...props }) {
  return (
    <label className="inline-flex items-center gap-2 select-none cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        {...props}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
