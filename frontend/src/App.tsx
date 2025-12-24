import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import luxonPlugin from "@fullcalendar/luxon3";
import { DateTime } from "luxon";
import TimezoneToggle from "./components/TimezoneToggle";
import EventModal from "./components/EventModal";
import { TIMEZONES, TimezoneValue, toInputValue } from "./timezone";
import { CalendarEvent, EventDraft } from "./types";
import {
  createEvent,
  deleteEvent,
  getAuthStatus,
  getEvents,
  getLoginUrl,
  updateEvent
} from "./api";

const emptyDraft: EventDraft = {
  title: "",
  description: "",
  attendees: "",
  startLocal: "",
  endLocal: ""
};

const makeDraftFromUtc = (
  event: CalendarEvent,
  zone: TimezoneValue
): EventDraft => {
  const start = DateTime.fromISO(event.startUtc).setZone(zone);
  const end = DateTime.fromISO(event.endUtc).setZone(zone);
  return {
    id: event.id,
    title: event.title,
    description: event.description ?? "",
    attendees: event.attendees.join(", "),
    startLocal: toInputValue(start),
    endLocal: toInputValue(end)
  };
};

const makeDraftFromSelection = (
  start: Date,
  end: Date,
  zone: TimezoneValue
): EventDraft => {
  const startLocal = DateTime.fromJSDate(start).setZone(zone);
  const endLocal = DateTime.fromJSDate(end).setZone(zone);
  return {
    ...emptyDraft,
    startLocal: toInputValue(startLocal),
    endLocal: toInputValue(endLocal)
  };
};

const App = () => {
  const [timezone, setTimezone] = useState<TimezoneValue>(TIMEZONES[0].value);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [draft, setDraft] = useState<EventDraft>(emptyDraft);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [authState, setAuthState] = useState<{
    authenticated: boolean;
    email?: string;
  }>({ authenticated: false });
  const calendarRef = useRef<FullCalendar | null>(null);

  useEffect(() => {
    getAuthStatus()
      .then(setAuthState)
      .catch(() => setAuthState({ authenticated: false }));
  }, []);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.setOption("timeZone", timezone);
    api.refetchEvents();
  }, [timezone]);

  const refreshCalendar = () => {
    calendarRef.current?.getApi().refetchEvents();
  };

  const openCreateModal = (start: Date, end: Date) => {
    setMode("create");
    setActiveEvent(null);
    setDraft(makeDraftFromSelection(start, end, timezone));
    setModalOpen(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setMode("edit");
    setActiveEvent(event);
    setDraft(makeDraftFromUtc(event, timezone));
    setModalOpen(true);
  };

  const handleSave = async (payload: {
    title: string;
    description: string;
    attendees: string[];
    startUtc: string;
    endUtc: string;
  }) => {
    if (mode === "create") {
      await createEvent(payload);
    } else if (activeEvent) {
      await updateEvent(activeEvent.id, payload);
    }
    setModalOpen(false);
    refreshCalendar();
  };

  const handleDelete = async () => {
    if (!activeEvent) return;
    await deleteEvent(activeEvent.id);
    setModalOpen(false);
    refreshCalendar();
  };

  return (
    <div className="app">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Toggle For Timezone Flipping</p>
          <h1>Vaida Rahul Thingy</h1>
        </div>
        <div className="auth-box">
          {authState.authenticated ? (
            <div>
              <p className="auth-status">Signed in</p>
              {authState.email && <p>{authState.email}</p>}
            </div>
          ) : (
            <a className="primary" href={getLoginUrl()}>
              Sign in with Google
            </a>
          )}
        </div>
      </header>

      <section className="controls">
        <TimezoneToggle value={timezone} onChange={setTimezone} />
        <div className="timezone-hint">
          Viewing in <strong>{timezone}</strong>
        </div>
      </section>

      <section className="calendar-shell">
        <FullCalendar
          ref={calendarRef}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            luxonPlugin
          ]}
          initialView="timeGridWeek"
          timeZone={timezone}
          selectable
          selectMirror
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
          }}
          select={(info) => openCreateModal(info.start, info.end)}
          eventClick={(info) => {
            const eventData = info.event.extendedProps as CalendarEvent;
            openEditModal(eventData);
          }}
          events={async (info, success, failure) => {
            try {
              const events = await getEvents(
                info.start.toISOString(),
                info.end.toISOString()
              );
              success(
                events.map((event) => ({
                  id: event.id,
                  title: event.title,
                  start: event.startUtc,
                  end: event.endUtc,
                  extendedProps: event
                }))
              );
            } catch (error) {
              failure(error as Error);
            }
          }}
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short"
          }}
          height="auto"
        />
      </section>

      <EventModal
        isOpen={modalOpen}
        mode={mode}
        timezone={timezone}
        draft={draft}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={mode === "edit" ? handleDelete : undefined}
        onChange={setDraft}
      />
    </div>
  );
};

export default App;
