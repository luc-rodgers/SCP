export function parseTimeToMinutes(t) {
  if (!t) return null;
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function diffMinutes(start, end) {
  const s = parseTimeToMinutes(start || "");
  const e = parseTimeToMinutes(end || "");
  if (s == null || e == null) return 0;
  const delta = e >= s ? e - s : e + 24 * 60 - s;
  return Math.max(0, delta);
}

export function minutesToHours(mins) {
  const safe = Math.max(0, Math.floor(mins));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}.${String(Math.round((m / 60) * 100)).padStart(2, "0")}`;
}

export function sumJobMinutes(jobs) {
  return (jobs || []).reduce((acc, j) => acc + diffMinutes(j.onSite, j.offSite), 0);
}

export function dayTotalMinutes(day) {
  const jobMins = sumJobMinutes(day.jobs || []);
  const depotMins = diffMinutes(day.depotStart, day.depotFinish);
  const base = Math.max(jobMins, depotMins);
  const lunchDeduct = day.lunch ? 30 : 0;
  return Math.max(0, base - lunchDeduct);
}

export function buildIntervals() {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}