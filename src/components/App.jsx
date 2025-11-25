import React, { useState, useMemo } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import { defaultWeek } from "../utils/defaults";
import { dayTotalMinutes, minutesToHours } from "../utils/time";
import Labeled from "./Labeled";
import TextInput from "./TextInput";
import DayCard from "./DayCard";
import AllowanceTable from "./AllowanceTable";
import ExportAndActions from "./ExportAndActions";
import SignaturePad from "./SignaturePad";
import SectionCard from "./SectionCard";
import Dashboard from "./Dashboard";
import EmployeeDetail from "./EmployeeDetail";
import ProjectDetail from "./ProjectDetail";

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
      <Dashboard
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
