export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  startUtc: string;
  endUtc: string;
  attendees: string[];
};

export type EventDraft = {
  id?: string;
  title: string;
  description: string;
  startLocal: string;
  endLocal: string;
  attendees: string;
};
