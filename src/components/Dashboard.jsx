import React, { useState, useMemo } from "react";
import { dayTotalMinutes } from "../utils/time";
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

export default function Dashboard({
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
