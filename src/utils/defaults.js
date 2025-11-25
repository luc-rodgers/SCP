export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const emptyJob = () => ({ unitJobName: "", onSite: "", offSite: "" });
export const emptyWeather = () => ({ type: "", start: "", finish: "", approval: "" });
export const emptyAllowanceRow = () => ({ start: "", finish: "", unitNo: "", apprBy: "" });
export const emptyDay = () => ({
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
export const defaultWeek = () => ({
  meta: {
    name: "",
    className: "",
    weekEnding: (() => {
      const d = new Date();
      const day = d.getDay();
      const offset = (7 - day) % 7;
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
