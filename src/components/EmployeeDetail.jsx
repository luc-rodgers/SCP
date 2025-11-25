import React from "react";
import { DAYS } from "../utils/defaults";
import { diffMinutes, minutesToHours, dayTotalMinutes } from "../utils/time";
import SectionCard from "./SectionCard";

function readHistory() {
  try {
    const raw = localStorage.getItem("timesheet-history");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function EmployeeDetail({ name, onBack, onOpenWeek = () => {} }) {
  const history = readHistory();
  const weeks = history.filter((w) => w.meta && w.meta.name === name);

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6 bg-gray-50">
      <button
        onClick={onBack}
        className="px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
      >
        ← Back
      </button>
      <h2 className="text-xl font-semibold mb-6">{name}</h2>
      {weeks.length === 0 ? (
        <div className="text-sm text-gray-600">No saved records.</div>
      ) : (
        weeks.map((wk, wIdx) => (
          <SectionCard
            key={wIdx}
            title={`Week Ending: ${wk.meta?.weekEnding || "(unknown)"}`}
            onClickTitle={() => onOpenWeek(wk)}
            right={
              <span
                className="text-sm text-blue-700 cursor-pointer"
                onClick={() => onOpenWeek(wk)}
              >
                Open →
              </span>
            }
          >
            <div className="space-y-3">
              {wk.days
                .map((d, i) => ({ d, i }))
                .filter(({ d }) => {
                  const hasJobs = (d.jobs || []).some(
                    (j) => j.unitJobName || j.onSite || j.offSite
                  );
                  const hasDepot = d.depotStart || d.depotFinish;
                  const hasWeather = (d.weather || []).length > 0;
                  const hasRemarks = d.remarks && d.remarks.trim() !== "";
                  return hasJobs || hasDepot || hasWeather || hasRemarks;
                })
                .sort((a, b) => b.i - a.i)
                .map(({ d, i }) => {
                  const total = minutesToHours(dayTotalMinutes(d));
                  let dateStr = "";
                  const sunday = wk.meta?.weekEnding
                    ? new Date(wk.meta.weekEnding)
                    : null;
                  if (sunday && !isNaN(sunday)) {
                    const dd = new Date(sunday);
                    const offset = i - 6;
                    dd.setDate(sunday.getDate() + offset);
                    const opts = {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    };
                    dateStr = dd.toLocaleDateString(undefined, opts);
                  }
                  return (
                    <details key={i} className="border rounded-md p-2">
                      <summary className="flex justify-between cursor-pointer list-none">
                        <span>{`${DAYS[i]} – ${dateStr}`}</span>
                        <span className="text-sm text-gray-600">{total} h</span>
                      </summary>
                      <div className="mt-2 space-y-2 text-sm">
                        {(d.jobs || []).map((j, jIdx) => {
                          const mins = diffMinutes(j.onSite, j.offSite);
                          const hrs = minutesToHours(mins);
                          return (
                            <div
                              key={jIdx}
                              className="pl-2 border-l flex flex-wrap gap-4 text-sm"
                            >
                              <span>
                                <b>Job:</b> {j.unitJobName || "(No name)"}
                              </span>
                              <span>
                                <b>On:</b> {j.onSite || "-"}
                              </span>
                              <span>
                                <b>Off:</b> {j.offSite || "-"}
                              </span>
                              <span>
                                <b>Total:</b> {hrs}h
                              </span>
                            </div>
                          );
                        })}
                        {(d.weather || []).length > 0 && (
                          <div className="pt-2 border-t">
                            <b>Weather:</b>
                            {(d.weather || []).map((w, wi) => (
                              <div key={wi} className="pl-2 border-l">
                                <span>{w.type || "(type)"}</span> ({w.start || "-"}–
                                {w.finish || "-"})
                                {w.approval && ` Approved: ${w.approval}`}
                              </div>
                            ))}
                          </div>
                        )}
                        {d.remarks && (
                          <div className="pt-2 text-gray-700">
                            <b>Remarks:</b> {d.remarks}
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
            </div>
          </SectionCard>
        ))
      )}
    </div>
  );
}
