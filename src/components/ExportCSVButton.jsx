import React from "react";
import { DAYS } from "../utils/defaults";
import { diffMinutes, minutesToHours, sumJobMinutes } from "../utils/time";

export default function ExportCSVButton({ week, weeklyTotalStr }) {
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
