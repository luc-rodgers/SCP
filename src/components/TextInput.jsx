import React from "react";

export default function TextInput({ value, onChange, placeholder, ...props }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border rounded-lg px-3 py-2 text-sm w-full"
      {...props}
    />
  );
}
