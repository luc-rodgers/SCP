import React from "react";
import ExportCSVButton from "./ExportCSVButton";

export default function ExportAndActions({ week, weeklyTotals, onPrint, onClear, onViewDashboard, onSaveWeek }) {
  return (
    <div className="flex gap-2 pt-2 justify-center print:hidden">
      <button
        onClick={onViewDashboard}
        className="px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
      >
        Dashboard →
      </button>
      <button
        onClick={onSaveWeek}
        className="px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
      >
        Save Week
      </button>
      <ExportCSVButton week={week} weeklyTotalStr={weeklyTotals.totalStr} />
      <button
        onClick={onPrint}
        className="px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
      >
        Print
      </button>
      <button
        onClick={onClear}
        className="px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
      >
        Clear
      </button>
    </div>
  );
}
