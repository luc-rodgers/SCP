import React from "react";
import { diffMinutes, minutesToHours } from "../utils/time";
import Labeled from "./Labeled";
import TimeInput from "./TimeInput";

export default function JobInputs({ job, onChange, projects = [] }) {
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
