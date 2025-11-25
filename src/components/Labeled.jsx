import React from "react";

export default function Labeled({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
