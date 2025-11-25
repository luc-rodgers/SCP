import React from "react";

export default function SectionCard({ title, children }) {
  return (
    <section className="section-card">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}