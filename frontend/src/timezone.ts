import { DateTime } from "luxon";

export const TIMEZONES = [
  { label: "America/Chicago (CST/CDT)", value: "America/Chicago" },
  { label: "Asia/Kolkata (IST)", value: "Asia/Kolkata" }
] as const;

export type TimezoneValue = (typeof TIMEZONES)[number]["value"];

export const toInputValue = (dt: DateTime) =>
  dt.toFormat("yyyy-LL-dd'T'HH:mm");

export const fromInputValue = (value: string, zone: string) =>
  DateTime.fromFormat(value, "yyyy-LL-dd'T'HH:mm", { zone });
