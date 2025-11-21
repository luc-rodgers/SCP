// SCP Timesheet Prototype – stable build
// - Full timesheet with jobs, weather, allowances, requests, signature
// - Dashboard: by employee / project / date + detail pages
// - CSV export fixed (no unterminated regex / strings)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

// =============================================================
// Constants & Helpers
// =============================================================
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const emptyJob = () => ({ unitJobName: "", onSite: "", offSite: "" });
const emptyWeather = () => ({ type: "", start: "", finish: "", approval: "" });
const emptyAllowanceRow = () => ({ start: "", finish: "", unitNo: "", apprBy: "" });
const emptyDay = () => ({
  depotStart: "",
  depotFinish: "",
  lunch: false,
  lunchPenalty: false,
  lunchTime: "",
  jobs: [emptyJob()],
  weather: [],
  remarks: "",
  approvedBy: "",
});

const defaultWeek = () => ({
  meta: {
    name: "",
    className: "",
    weekEnding: (() => {
      const d = new Date();
      const day = d.getDay();
      const offset = (7 - day) % 7; // upcoming Sunday (or today if Sunday)
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    })(),
  },
  days: DAYS.map(() => emptyDay()),
  sprayAllowance: DAYS.map(() => emptyAllowanceRow()),
  wetHours: DAYS.map(() => emptyAllowanceRow()),
  payoutRequest: { type: "", totalHours: "", rdoHours: "" },
  holdRequest: { type: "", totalHours: "", rdoHours: "" },
  signatureDataUrl: "",
});

function parseTimeToMinutes(t) {
  if (!t) return null;
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function diffMinutes(start, end) {
  const s = parseTimeToMinutes(start || "");
  const e = parseTimeToMinutes(end || "");
  if (s == null || e == null) return 0;
  const delta = e >= s ? e - s : e + 24 * 60 - s;
  return Math.max(0, delta);
}

function minutesToHours(mins) {
  const safe = Math.max(0, Math.floor(mins));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}.${String(Math.round((m / 60) * 100)).padStart(2, "0")}`;
}

function sumJobMinutes(jobs) {
  return (jobs || []).reduce((acc, j) => acc + diffMinutes(j.onSite, j.offSite), 0);
}

function dayTotalMinutes(day) {
  const jobMins = sumJobMinutes(day.jobs || []);
  const depotMins = diffMinutes(day.depotStart, day.depotFinish);
  const base = Math.max(jobMins, depotMins);
  const lunchDeduct = day.lunch ? 30 : 0;
  return Math.max(0, base - lunchDeduct);
}

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

// History helpers
function readHistory() {
  try {
    const raw = localStorage.getItem("timesheet-history");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function writeHistory(arr) {
  try {
    localStorage.setItem("timesheet-history", JSON.stringify(arr || []));
  } catch {}
}

// Build 15-min interval list
function buildIntervals() {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}

// ================= UI Primitives =================
function SectionCard({ title, right, children, onClickTitle }) {
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

function Labeled({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function TimeInput({ value, onChange }) {
  const intervals = useMemo(buildIntervals, []);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm w-full"
    >
      <option value=""></option>
      {intervals.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border rounded-lg px-3 py-2 text-sm w-full"
    />
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 select-none cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    const getPos = (e) => {
      const rect = c.getBoundingClientRect();
      const touch = e.touches && e.touches[0];
      const clientX = touch ? touch.clientX : e.clientX;
      const clientY = touch ? touch.clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e) => {
      drawing.current = true;
      const { x, y } = getPos(e);
      const ctx2 = c.getContext("2d");
      ctx2.beginPath();
      ctx2.moveTo(x, y);
    };
    const move = (e) => {
      if (!drawing.current) return;
      const { x, y } = getPos(e);
      const ctx2 = c.getContext("2d");
      ctx2.lineTo(x, y);
      ctx2.stroke();
    };
    const end = () => {
      if (!drawing.current) return;
      drawing.current = false;
      onChange(c.toDataURL());
    };

    c.addEventListener("mousedown", start);
    c.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);

    c.addEventListener("touchstart", start, { passive: true });
    c.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);

    return () => {
      c.removeEventListener("mousedown", start);
      c.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      c.removeEventListener("touchstart", start);
      c.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
    };
  }, [onChange]);

  useEffect(() => {
    if (!value) return;
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
    };
    img.src = value;
  }, [value]);

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        className="border rounded-lg bg-white"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clear}
          className="px-3 py-1.5 border rounded-lg text-sm"
        >
          Clear
        </button>
        <span className="text-xs text-gray-500 self-center">Sign above</span>
      </div>
    </div>
  );
}

function JobInputs({ job, onChange, projects = [] }) {
  const mins = diffMinutes(job.onSite, job.offSite);
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <Labeled label="Project Name">
        <select
          value={job.unitJobName}
          onChange={(e) => onChange({ ...job, unitJobName: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm w-full"
        >
          <option value=""></option>
          {projects.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
              {p.client ? ` — ${p.client}` : ""}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled label="On Site">
        <TimeInput
          value={job.onSite}
          onChange={(v) => onChange({ ...job, onSite: v })}
        />
      </Labeled>
      <Labeled label="Off Site">
        <TimeInput
          value={job.offSite}
          onChange={(v) => onChange({ ...job, offSite: v })}
        />
      </Labeled>
      <Labeled label="Hours">
        <input
          className="border rounded-lg px-3 py-2 text-sm bg-gray-50"
          readOnly
          value={mins ? minutesToHours(mins) : "0.00"}
        />
      </Labeled>
    </div>
  );
}

function DayCard({
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

function AllowanceTable({ title, rows, onChangeRow, defaultCollapsed = true, printMode = false }) {
  const [open, setOpen] = useState(!defaultCollapsed ? true : false);
  const totalMinutes = rows.reduce((acc, r) => acc + diffMinutes(r.start, r.finish), 0);
  const totalHoursStr = minutesToHours(totalMinutes);

  return (
    <SectionCard
      title={
        <div
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between cursor-pointer w-full"
        >
          <span>{title}</span>
          {!printMode && (
            <span className="text-xs text-gray-500">{open ? "▾" : "▸"}</span>
          )}
        </div>
      }
      right={
        <span className="text-sm text-gray-500 whitespace-nowrap">
          Total: <b>{totalHoursStr}</b> h
        </span>
      }
    >
      {(open || printMode) && (
        <div className="overflow-x-auto">
          <table className="table table-striped table-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-3">Day</th>
                <th className="py-2 pr-3">Start</th>
                <th className="py-2 pr-3">Finish</th>
                <th className="py-2 pr-3 w-20">Hours</th>
                <th className="py-2 pr-3 w-24">Unit No</th>
                <th className="py-2 pr-3 w-24">Appr By</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-3">{DAYS[i]}</td>
                  <td className="py-2 pr-3">
                    <TimeInput
                      value={r.start}
                      onChange={(v) => onChangeRow(i, { ...r, start: v })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <TimeInput
                      value={r.finish}
                      onChange={(v) => onChangeRow(i, { ...r, finish: v })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    {minutesToHours(diffMinutes(r.start, r.finish))}
                  </td>
                  <td className="py-2 pr-3">
                    <TextInput
                      value={r.unitNo}
                      onChange={(v) => onChangeRow(i, { ...r, unitNo: v })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <TextInput
                      value={r.apprBy}
                      onChange={(v) => onChangeRow(i, { ...r, apprBy: v })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function ExportCSVButton({ week, weeklyTotalStr }) {
  function toCSV() {
    const rows = [];
    rows.push(["Name", week.meta.name]);
    rows.push(["Class", week.meta.className]);
    rows.push(["Week Ending", week.meta.weekEnding]);
    rows.push([]);

    const maxJobs = Math.max(...week.days.map((d) => d.jobs.length));

    const header = [
      "Day",
      "Depot Start",
      "Depot Finish",
      "Lunch",
      "Lunch Penalty",
      "Lunch Time",
    ];
    for (let j = 0; j < maxJobs; j++) {
      header.push(`Job${j + 1} Name`, `Job${j + 1} On`, `Job${j + 1} Off`);
    }
    header.push("Remarks", "Approved By", "Total Hours");
    rows.push(header);

    for (let i = 0; i < DAYS.length; i++) {
      const d = week.days[i];
      const totalMins =
        Math.max(sumJobMinutes(d.jobs), diffMinutes(d.depotStart, d.depotFinish)) -
        (d.lunch ? 30 : 0);
      const row = [
        DAYS[i],
        d.depotStart,
        d.depotFinish,
        d.lunch ? "Y" : "N",
        d.lunchPenalty ? "Y" : "N",
        d.lunchTime,
      ];
      for (let j = 0; j < maxJobs; j++) {
        const job = d.jobs[j];
        if (job) row.push(job.unitJobName, job.onSite, job.offSite);
        else row.push("", "", "");
      }
      row.push(
        d.remarks,
        d.approvedBy,
        minutesToHours(Math.max(0, totalMins))
      );
      rows.push(row);
    }

    rows.push([]);
    rows.push(["Spray Allowance"]);
    rows.push(["Day", "Start", "Finish", "Hours", "Unit No", "Appr By"]);
    for (let i = 0; i < DAYS.length; i++) {
      const r = week.sprayAllowance[i];
      const mins = diffMinutes(r.start, r.finish);
      rows.push([
        DAYS[i],
        r.start,
        r.finish,
        minutesToHours(mins),
        r.unitNo,
        r.apprBy,
      ]);
    }

    rows.push([]);
    rows.push(["Wet Hours"]);
    rows.push(["Day", "Start", "Finish", "Hours", "Unit No", "Appr By"]);
    for (let i = 0; i < DAYS.length; i++) {
      const r = week.wetHours[i];
      const mins = diffMinutes(r.start, r.finish);
      rows.push([
        DAYS[i],
        r.start,
        r.finish,
        minutesToHours(mins),
        r.unitNo,
        r.apprBy,
      ]);
    }

    rows.push([]);
    rows.push(["Weekly Total", weeklyTotalStr]);

    const csv = rows
      .map((r) =>
        r
          .map((v) => {
            const s = String(v ?? "");
            // Quote fields containing comma, quote, or newline
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet_${week.meta.weekEnding || "week"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={toCSV}
      className="px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
      aria-label="Export timesheet to CSV"
    >
      Export CSV
    </button>
  );
}

// ============== Dashboard ==============
function DashboardView({
  onBack,
  onSelectEmployee,
  onSelectProject,
  projects = [],
  setProjects,
}) {
  const [mode, setMode] = useState("employee"); // employee | project | date
  const history = readHistory();

  // Normalize any legacy string projects to objects
  const projectObjs = useMemo(
    () => (projects || []).map((p) => (typeof p === "string" ? { name: p, client: "" } : p)),
    [projects]
  );

  const [newProjectName, setNewProjectName] = useState("");
  const [newClientName, setNewClientName] = useState("");

  const summaries = useMemo(() => {
    const byEmployee = new Map();
    const byProject = new Map();
    const byDate = new Map();

    for (const wk of history) {
      const weekTotal = (wk.days || []).reduce(
        (acc, d) => acc + dayTotalMinutes(d),
        0
      );
      const emp = (wk.meta && wk.meta.name) || "(Unnamed)";
      const date = (wk.meta && wk.meta.weekEnding) || "(No date)";
      byEmployee.set(emp, (byEmployee.get(emp) || 0) + weekTotal);
      byDate.set(date, (byDate.get(date) || 0) + weekTotal);

      for (const d of wk.days || []) {
        for (const j of d.jobs || []) {
          const label = (j.unitJobName || "").trim() || "(No project)";
          const m = diffMinutes(j.onSite, j.offSite);
          byProject.set(label, (byProject.get(label) || 0) + m);
        }
      }
    }

    const fmt = (entries) =>
      Array.from(entries)
        .map(([k, v]) => ({ key: k, minutes: v, hours: minutesToHours(v) }))
        .sort((a, b) => b.minutes - a.minutes);

    return {
      byEmployee: fmt(byEmployee),
      byProject: fmt(byProject),
      byDate: fmt(byDate),
    };
  }, [history]);

  const [showAddProject, setShowAddProject] = useState(false);

  const Button = ({ active, children, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`btn btn-outline-secondary ${active ? "active" : ""}`}
    >
      {children}
    </button>
  );

  const rawRows =
    mode === "employee"
      ? summaries.byEmployee
      : mode === "project"
      ? summaries.byProject
      : summaries.byDate;
  const rows = rawRows;

  const title =
    mode === "employee" ? "By Employee" : mode === "project" ? "By Project" : "By Date";

  return (
    <div className="container py-4 bg-gray-50 space-y-6">
      <button
        onClick={onBack}
        className="px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
      >
        ← Back to Timesheet
      </button>
      <div className="card p-3 shadow-sm space-y-6">
        <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
        {/* Space out the view selectors */}
        <div className="flex gap-2 mb-4" role="group">
          <Button active={mode === "employee"} onClick={() => setMode("employee")}>
            By Employee
          </Button>
          <Button active={mode === "project"} onClick={() => setMode("project")}>
            By Project
          </Button>
          <Button active={mode === "date"} onClick={() => setMode("date")}>
            By Date
          </Button>
        </div>

        {mode === "project" && (
          <div className="space-y-2 mb-4">
            {!showAddProject && (
              <button
                onClick={() => setShowAddProject(true)}
                className="px-3 py-1.5 border rounded-md text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                + Add Project
              </button>
            )}
            {showAddProject && (
              <div className="flex flex-col gap-2 w-full max-w-sm">
                <input
                  type="text"
                  className="border rounded-md px-3 py-1.5 text-sm w-full"
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
                <input
                  type="text"
                  className="border rounded-md px-3 py-1.5 text-sm w-full"
                  placeholder="Client name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const name = (newProjectName || "").trim();
                      const client = (newClientName || "").trim();
                      if (name) {
                        const exists = projectObjs.some(
                          (p) => p.name.toLowerCase() === name.toLowerCase()
                        );
                        const next = exists
                          ? projectObjs.map((p) =>
                              p.name.toLowerCase() === name.toLowerCase()
                                ? { ...p, client }
                                : p
                            )
                          : [...projectObjs, { name, client }];
                        setProjects(next);
                      }
                      setNewProjectName("");
                      setNewClientName("");
                      setShowAddProject(false);
                    }}
                    className="px-3 py-1.5 border rounded-md text-sm bg-gray-200 hover:bg-gray-300 text-gray-800"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowAddProject(false);
                      setNewProjectName("");
                      setNewClientName("");
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="table table-striped table-hover table-sm table-bordered">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-3">{title}</th>
                <th className="py-2 pr-3">Hours</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr className="border-t">
                  <td className="py-3 text-gray-500" colSpan={2}>
                    No history saved yet. Click "Save Week" on the timesheet.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="py-2 pr-3">
                    {title === "By Employee" ? (
                      <button
                        className="text-blue-600 underline"
                        onClick={() => onSelectEmployee(r.key)}
                      >
                        {r.key}
                      </button>
                    ) : title === "By Project" ? (
                      <button
                        className="text-blue-600 underline"
                        onClick={() => onSelectProject(r.key)}
                      >
                        {r.key}
                        {(() => {
                          const p = projectObjs.find(
                            (x) => x.name.trim() === r.key.trim()
                          );
                          return p && p.client ? ` — ${p.client}` : "";
                        })()}
                      </button>
                    ) : (
                      r.key
                    )}
                  </td>
                  <td className="py-2 pr-3">{r.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Employee detail – list of days across all weeks for that employee
function EmployeeDetail({ name, onBack, onOpenWeek = () => {} }) {
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

function ProjectDetail({ project, onBack, projects = [] }) {
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

function ExportAndActions({ week, weeklyTotals, onPrint, onClear, onViewDashboard, onSaveWeek }) {
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

export default function App() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useLocalStorage("project-list", []);
  const [week, setWeek] = useLocalStorage("timesheet-week", defaultWeek());
  const [printMode, setPrintMode] = useState(false);
  const [view, setView] = useState("sheet");

  const weeklyTotals = useMemo(() => {
    const totalMin = week.days.reduce((acc, d) => acc + dayTotalMinutes(d), 0);
    return { totalMin, totalStr: minutesToHours(totalMin) };
  }, [week.days]);

  function resetWeek() {
    if (
      typeof window !== "undefined" &&
      window.confirm("Clear all fields for this week?")
    ) {
      setWeek(defaultWeek());
    }
  }

  function printSheet() {
    setPrintMode(true);
    setTimeout(() => {
      if (typeof window !== "undefined") window.print();
      setPrintMode(false);
    }, 0);
  }

  function saveWeekToHistory() {
    const history = readHistory();
    history.push(week);
    writeHistory(history);
    setWeek(defaultWeek());
  }

  // Lightweight runtime tests
  useEffect(() => {
    console.assert(
      parseTimeToMinutes("08:15") === 495,
      "parseTimeToMinutes 08:15"
    );
    console.assert(
      diffMinutes("22:30", "01:15") === 165,
      "diffMinutes overnight"
    );
    const ivals = buildIntervals();
    console.assert(
      ivals.length === 96 && ivals[0] === "00:00" && ivals[95] === "23:45",
      "interval list"
    );
    const d0 = emptyDay();
    d0.jobs = [{ onSite: "07:00", offSite: "15:30" }];
    console.assert(
      minutesToHours(dayTotalMinutes(d0)) === minutesToHours(510),
      "day total calc"
    );
    console.assert(
      Array.isArray(defaultWeek().days) && defaultWeek().days.length === 7,
      "week has 7 days"
    );
    console.assert(
      Object.prototype.hasOwnProperty.call(defaultWeek(), "payoutRequest"),
      "has payoutRequest"
    );
    console.assert(
      Object.prototype.hasOwnProperty.call(defaultWeek(), "holdRequest"),
      "has holdRequest"
    );
  }, []);

  // Routing
  if (view === "employeeDetail") {
    return (
      <EmployeeDetail
        name={selectedEmployee || "(Unnamed)"}
        onBack={() => setView("dashboard")}
        onOpenWeek={(wk) => {
          setWeek(wk);
          setView("sheet");
        }}
      />
    );
  }

  if (view === "projectDetail") {
    return (
      <ProjectDetail
        project={selectedProject}
        projects={projects}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "dashboard") {
    return (
      <DashboardView
        onBack={() => setView("sheet")}
        onSelectEmployee={(name) => {
          setSelectedEmployee(name);
          setView("employeeDetail");
        }}
        onSelectProject={(proj) => {
          setSelectedProject(proj);
          setView("projectDetail");
        }}
        projects={projects}
        setProjects={setProjects}
      />
    );
  }

  // Default: Timesheet Sheet View
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-6 bg-gray-50">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Labeled label="Employee Name">
            <TextInput
              value={week.meta.name}
              onChange={(v) =>
                setWeek({ ...week, meta: { ...week.meta, name: v } })
              }
            />
          </Labeled>
          <Labeled label="Class">
            <TextInput
              value={week.meta.className}
              onChange={(v) =>
                setWeek({ ...week, meta: { ...week.meta, className: v } })
              }
            />
          </Labeled>
          <Labeled label="Week Ending (Sunday)">
            <input
              type="date"
              value={week.meta.weekEnding}
              onChange={(e) =>
                setWeek({
                  ...week,
                  meta: { ...week.meta, weekEnding: e.target.value },
                })
              }
              className="border rounded-lg px-3 py-2 text-sm w-full"
            />
          </Labeled>
        </div>
      </div>

      {/* Actions (top) */}
      <ExportAndActions
        week={week}
        weeklyTotals={weeklyTotals}
        onPrint={printSheet}
        onClear={resetWeek}
        onViewDashboard={() => setView("dashboard")}
        onSaveWeek={saveWeekToHistory}
      />

      {/* Days */}
      {week.days.map((d, i) => (
        <DayCard
          key={i}
          index={i}
          day={d}
          onChange={(v) => {
            const days = week.days.slice();
            days[i] = v;
            setWeek({ ...week, days });
          }}
          weekEnding={week.meta.weekEnding}
          projects={projects}
          printMode={printMode}
        />
      ))}

      {/* Allowances */}
      <AllowanceTable
        title="Spray Allowance"
        rows={week.sprayAllowance}
        onChangeRow={(i, row) => {
          const arr = week.sprayAllowance.slice();
          arr[i] = row;
          setWeek({ ...week, sprayAllowance: arr });
        }}
      />

      <AllowanceTable
        title="Wet Hours"
        rows={week.wetHours}
        onChangeRow={(i, row) => {
          const arr = week.wetHours.slice();
          arr[i] = row;
          setWeek({ ...week, wetHours: arr });
        }}
      />

      {/* Requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Payout Request">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Labeled label="Type">
              <TextInput
                value={week.payoutRequest.type}
                onChange={(v) =>
                  setWeek({
                    ...week,
                    payoutRequest: { ...week.payoutRequest, type: v },
                  })
                }
              />
            </Labeled>
            <Labeled label="Total Hours">
              <TextInput
                value={week.payoutRequest.totalHours}
                onChange={(v) =>
                  setWeek({
                    ...week,
                    payoutRequest: {
                      ...week.payoutRequest,
                      totalHours: v,
                    },
                  })
                }
              />
            </Labeled>
            <Labeled label="RDO Hours">
              <TextInput
                value={week.payoutRequest.rdoHours}
                onChange={(v) =>
                  setWeek({
                    ...week,
                    payoutRequest: { ...week.payoutRequest, rdoHours: v },
                  })
                }
              />
            </Labeled>
          </div>
        </SectionCard>
        <SectionCard title="Hold Request">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Labeled label="Type">
              <TextInput
                value={week.holdRequest.type}
                onChange={(v) =>
                  setWeek({
                    ...week,
                    holdRequest: { ...week.holdRequest, type: v },
                  })
                }
              />
            </Labeled>
            <Labeled label="Total Hours">
              <TextInput
                value={week.holdRequest.totalHours}
                onChange={(v) =>
                  setWeek({
                    ...week,
                    holdRequest: {
                      ...week.holdRequest,
                      totalHours: v,
                    },
                  })
                }
              />
            </Labeled>
            <Labeled label="RDO Hours">
              <TextInput
                value={week.holdRequest.rdoHours}
                onChange={(v) =>
                  setWeek({
                    ...week,
                    holdRequest: { ...week.holdRequest, rdoHours: v },
                  })
                }
              />
            </Labeled>
          </div>
        </SectionCard>
      </div>

      {/* Signature */}
      <SectionCard title="Signature">
        <SignaturePad
          value={week.signatureDataUrl}
          onChange={(v) => setWeek({ ...week, signatureDataUrl: v })}
        />
      </SectionCard>

      <div className="text-xs text-gray-500 text-center pb-8">
        Local-only prototype. Saving stores data in your browser.
      </div>
    </div>
  );
}

// Mount
const el = document.getElementById("root");
if (el) {
  const root = createRoot(el);
  root.render(<App />);
}
