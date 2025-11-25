import React, { useMemo } from "react";
import { DAYS } from "../utils/defaults";
import { diffMinutes, minutesToHours } from "../utils/time";

function readHistory() {
  try {
    const raw = localStorage.getItem("timesheet-history");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function ProjectDetail({ project, onBack, projects = [] }) {
  const projectClient = useMemo(() => {
    const arr = (projects || []).map((p) =>
      typeof p === "string" ? { name: p, client: "" } : p
    );
    const found = arr.find(
      (p) => p.name.trim() === (project || "").trim()
    );
    return found?.client || "";
  }, [projects, project]);

  const history = readHistory();
  const rows = [];
  for (const wk of history) {
    const sunday = wk.meta?.weekEnding ? new Date(wk.meta.weekEnding) : null;
    for (let i = 0; i < wk.days.length; i++) {
      for (const j of wk.days[i].jobs || []) {
        if ((j.unitJobName || "").trim() !== (project || "").trim()) continue;
        const mins = diffMinutes(j.onSite, j.offSite);
        const hrs = minutesToHours(mins);
        let dateStr = "";
        if (sunday && !isNaN(sunday)) {
          const dd = new Date(sunday);
          const offset = i - 6;
          dd.setDate(sunday.getDate() + offset);
          const opts = { month: "short", day: "numeric", year: "numeric" };
          dateStr = dd.toLocaleDateString(undefined, opts);
        }
        rows.push({
          dateStr,
          dayName: DAYS[i],
          employee: wk.meta?.name || "(Unnamed)",
          range: `${j.onSite || "-"} → ${j.offSite || "-"}`,
          hrs,
        });
      }
    }
  }
  rows.sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));
  const totalHours = rows
    .reduce((acc, r) => acc + Number(r.hrs), 0)
    .toFixed(2);

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6 bg-gray-50">
      <button
        onClick={onBack}
        className="px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
      >
        ← Back
      </button>
      <h2 className="text-xl font-semibold mb-2">
        {project} — {totalHours}h
      </h2>
      {projectClient && (
        <div className="text-sm text-gray-600 mb-2">Client: {projectClient}</div>
      )}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="table table-striped table-hover table-sm table-bordered text-sm w-full">
          <thead>
            <tr className="text-left text-gray-700">
              <th className="py-2 px-2">Date</th>
              <th className="py-2 px-2">Day</th>
              <th className="py-2 px-2">Employee</th>
              <th className="py-2 px-2">Project</th>
              <th className="py-2 px-2">Hours</th>
              <th className="py-2 px-2">Range</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-t">
                <td className="py-1 px-2">{r.dateStr}</td>
                <td className="py-1 px-2">{r.dayName}</td>
                <td className="py-1 px-2">{r.employee}</td>
                <td className="py-1 px-2">{project}</td>
                <td className="py-1 px-2">{r.hrs}h</td>
                <td className="py-1 px-2 whitespace-nowrap">{r.range}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-2 text-gray-600 text-center">
                  No entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
