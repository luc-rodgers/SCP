import React from "react";

export default function SectionCard({ title, right, children, onClickTitle }) {
  const titleEl = (
    <div className="flex items-center justify-between w-full">
      <div className="text-lg font-semibold w-full">
        {typeof title === "string" ? (
          <div className={onClickTitle ? "cursor-pointer text-blue-700" : ""} onClick={onClickTitle}>
            {title}
          </div>
        ) : (
          title
        )}
      </div>
      {right}
    </div>
  );
  return (
    <div className="bg-white shadow-sm rounded-2xl p-4 border border-gray-200">
      {titleEl}
      <div className="mt-3">{children}</div>
    </div>
  );
}