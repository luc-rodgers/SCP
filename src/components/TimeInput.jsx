import React, { useMemo } from "react";
import { buildIntervals } from "../utils/time";

export default function TimeInput({ value, onChange, label, ...props }) {
  const intervals = useMemo(buildIntervals, []);
  
  const selectElement = (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm w-full"
      {...props}
    >
      <option value=""></option>
      {intervals.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );

  if (label) {
    return (
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        {selectElement}
      </label>
    );
  }

  return selectElement;
}
