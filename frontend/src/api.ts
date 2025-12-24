import { CalendarEvent } from "./types";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

const handleJson = async (res: Response) => {
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return res.json();
};

export const getEvents = async (start: string, end: string) => {
  const params = new URLSearchParams({ start, end });
  const res = await fetch(`${baseUrl}/events?${params.toString()}`, {
    credentials: "include"
  });
  return handleJson(res) as Promise<CalendarEvent[]>;
};

export const createEvent = async (payload: {
  title: string;
  description?: string;
  attendees: string[];
  startUtc: string;
  endUtc: string;
}) => {
  const res = await fetch(`${baseUrl}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  return handleJson(res) as Promise<CalendarEvent>;
};

export const updateEvent = async (
  id: string,
  payload: {
    title: string;
    description?: string;
    attendees: string[];
    startUtc: string;
    endUtc: string;
  }
) => {
  const res = await fetch(`${baseUrl}/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  return handleJson(res) as Promise<CalendarEvent>;
};

export const deleteEvent = async (id: string) => {
  const res = await fetch(`${baseUrl}/events/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  return handleJson(res) as Promise<{ ok: true }>;
};

export const getAuthStatus = async () => {
  const res = await fetch(`${baseUrl}/auth/me`, { credentials: "include" });
  return handleJson(res) as Promise<{ authenticated: boolean; email?: string }>;
};

export const getLoginUrl = () => `${baseUrl}/auth/google`;
