import React, { useState, useMemo } from "react";
import { DAYS } from "../utils/defaults";
import { diffMinutes, sumJobMinutes, minutesToHours } from "../utils/time";
import { emptyJob, emptyWeather } from "../utils/defaults";
import SectionCard from "./SectionCard";
import Labeled from "./Labeled";
import TimeInput from "./TimeInput";
import Checkbox from "./Checkbox";
import JobInputs from "./JobInputs";
import TextInput from "./TextInput";

export default function DayCard({
  index,
  day,
  onChange,
  defaultCollapsed = true,
  printMode = false,
  weekEnding,
  projects = [],
}) {
  const [open, setOpen] = useState(!defaultCollapsed ? true : false);

  // Compute date string (e.g., Feb 10, 2025)
  const sunday = weekEnding ? new Date(weekEnding) : null;
  let dateStr = "";
  if (sunday && !isNaN(sunday)) {
    const d = new Date(sunday);
    const offset = index - 6;
    d.setDate(sunday.getDate() + offset);
    const opts = { month: "short", day: "numeric", year: "numeric" };
    dateStr = d.toLocaleDateString(undefined, opts);
  }

  const jobMinutes = useMemo(() => sumJobMinutes(day.jobs), [day.jobs]);
  const depotMinutes = useMemo(
    () => diffMinutes(day.depotStart, day.depotFinish),
    [day.depotStart, day.depotFinish]
  );
  const totalMinutes = Math.max(jobMinutes, depotMinutes) - (day.lunch ? 30 : 0);

  const updateJob = (j, data) => {
    const jobs = day.jobs.slice();
    jobs[j] = data;
    onChange({ ...day, jobs });
  };

  return (
    <SectionCard
      title={
        <div
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between cursor-pointer w-full"
        >
          <span>{`${DAYS[index]} – ${dateStr}`}</span>
          {!printMode && (
            <span className="text-xs text-gray-500">{open ? "▾" : "▸"}</span>
          )}
        </div>
      }
      right={
        <span className="text-sm text-gray-500 whitespace-nowrap">
          Total: <b>{minutesToHours(Math.max(0, totalMinutes))}</b> h
        </span>
      }
    >
      {(open || printMode) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Labeled label="Depot Start (leave blank if started on site)">
              <TimeInput
                value={day.depotStart}
                onChange={(v) => onChange({ ...day, depotStart: v })}
              />
            </Labeled>
            <Labeled label="Depot Finish (leave blank if finished on site)">
              <TimeInput
                value={day.depotFinish}
                onChange={(v) => onChange({ ...day, depotFinish: v })}
              />
            </Labeled>
            <div className="flex flex-col gap-2 justify-end">
              <Checkbox
                checked={day.lunch}
                onChange={(v) => onChange({ ...day, lunch: v })}
                label="Lunch taken"
              />
              <Checkbox
                checked={day.lunchPenalty}
                onChange={(v) => onChange({ ...day, lunchPenalty: v })}
                label="Claim lunch penalty"
              />
            </div>
            <Labeled label="Time lunch was taken">
              <TimeInput
                value={day.lunchTime}
                onChange={(v) => onChange({ ...day, lunchTime: v })}
              />
            </Labeled>
          </div>

          {/* Job sections dynamic */}
          <div className="mt-4 space-y-4">
            {day.jobs.map((job, j) => (
              <div
                key={j}
                className={`${
                  j % 2 === 0
                    ? "border-l-[4px] border-[#F2282A]"
                    : "border-l-[4px] border-gray-400"
                } border-t border-gray-300 pt-3 pl-3 relative`}
              >
                <JobInputs
                  job={job}
                  onChange={(v) => updateJob(j, v)}
                  projects={projects}
                />
                {day.jobs.length > 1 && j > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...day,
                        jobs: day.jobs.filter((_, idx) => idx !== j),
                      })
                    }
                    className="absolute top-2 right-2 text-xs text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange({ ...day, jobs: [...day.jobs, emptyJob()] })}
              className="px-3 py-1 text-xs rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              + Add Job
            </button>

            {/* Inclement Weather Section */}
            {(day.weather || []).map((w, wi) => (
              <div
                key={wi}
                className="border-l-[4px] border-blue-400 border-t border-gray-300 pt-3 pl-3 relative"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Labeled label="Weather Type">
                    <TextInput
                      value={w.type}
                      onChange={(v) => {
                        const weather = day.weather.slice();
                        weather[wi] = { ...w, type: v };
                        onChange({ ...day, weather });
                      }}
                    />
                  </Labeled>
                  <Labeled label="Start">
                    <TimeInput
                      value={w.start}
                      onChange={(v) => {
                        const weather = day.weather.slice();
                        weather[wi] = { ...w, start: v };
                        onChange({ ...day, weather });
                      }}
                    />
                  </Labeled>
                  <Labeled label="Finish">
                    <TimeInput
                      value={w.finish}
                      onChange={(v) => {
                        const weather = day.weather.slice();
                        weather[wi] = { ...w, finish: v };
                        onChange({ ...day, weather });
                      }}
                    />
                  </Labeled>
                  <Labeled label="Approval">
                    <TextInput
                      value={w.approval}
                      onChange={(v) => {
                        const weather = day.weather.slice();
                        weather[wi] = { ...w, approval: v };
                        onChange({ ...day, weather });
                      }}
                    />
                  </Labeled>
                </div>
                {day.weather.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...day,
                        weather: day.weather.filter((_, idx) => idx !== wi),
                      })
                    }
                    className="absolute top-2 right-2 text-xs text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onChange({ ...day, weather: [...(day.weather || []), emptyWeather()] })
              }
              className="px-3 py-1 text-xs border rounded-md text-blue-600 hover:bg-blue-50"
            >
              + Add Inclement Weather
            </button>
          </div>

          {/* Remarks & Approved By at bottom */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Labeled label="Remarks" className="md:col-span-2">
              <textarea
                className="border rounded-lg px-3 py-2 text-sm min-h-[42px] w-full"
                value={day.remarks}
                onChange={(e) => onChange({ ...day, remarks: e.target.value })}
                placeholder="Notes"
              />
            </Labeled>
            <Labeled label="Approved By">
              <TextInput
                value={day.approvedBy}
                onChange={(v) => onChange({ ...day, approvedBy: v })}
                placeholder="Supervisor"
              />
            </Labeled>
          </div>
        </>
      )}
    </SectionCard>
  );
}
