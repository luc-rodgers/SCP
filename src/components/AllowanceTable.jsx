import React, { useState } from "react";
import { DAYS } from "../utils/defaults";
import { diffMinutes, minutesToHours } from "../utils/time";
import SectionCard from "./SectionCard";
import TimeInput from "./TimeInput";
import TextInput from "./TextInput";

export default function AllowanceTable({ title, rows, onChangeRow, defaultCollapsed = true, printMode = false }) {
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
