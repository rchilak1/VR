import { DateTime } from "luxon";
import { EventDraft } from "../types";
import { TimezoneValue, fromInputValue } from "../timezone";

const toUtcIso = (value: string, zone: TimezoneValue) => {
  if (!value) return null;
  return fromInputValue(value, zone).toUTC().toISO();
};

type Props = {
  isOpen: boolean;
  mode: "create" | "edit";
  timezone: TimezoneValue;
  draft: EventDraft;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    description: string;
    attendees: string[];
    startUtc: string;
    endUtc: string;
  }) => void;
  onDelete?: () => void;
  onChange: (draft: EventDraft) => void;
};

const EventModal = ({
  isOpen,
  mode,
  timezone,
  draft,
  onClose,
  onSave,
  onDelete,
  onChange
}: Props) => {
  if (!isOpen) return null;

  const handleSave = () => {
    const startUtc = toUtcIso(draft.startLocal, timezone);
    const endUtc = toUtcIso(draft.endLocal, timezone);
    if (!startUtc || !endUtc) return;

    onSave({
      title: draft.title.trim(),
      description: draft.description.trim(),
      attendees: draft.attendees
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean),
      startUtc,
      endUtc
    });
  };

  const durationHours = () => {
    const start = fromInputValue(draft.startLocal, timezone);
    const end = fromInputValue(draft.endLocal, timezone);
    const diff = end.diff(start, "hours").hours;
    if (!Number.isFinite(diff)) return "";
    return `${diff.toFixed(1)}h`;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>{mode === "create" ? "Create event" : "Edit event"}</h2>
            <p className="modal-subtitle">
              Editing in <strong>{timezone}</strong>
            </p>
          </div>
          <button className="ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <label>
            Title
            <input
              value={draft.title}
              onChange={(event) =>
                onChange({ ...draft, title: event.target.value })
              }
              placeholder="Weekly sync"
            />
          </label>
          <label>
            Description
            <textarea
              value={draft.description}
              onChange={(event) =>
                onChange({ ...draft, description: event.target.value })
              }
              placeholder="Agenda, context, links"
            />
          </label>
          <div className="modal-grid">
            <label>
              Start time ({timezone})
              <input
                type="datetime-local"
                value={draft.startLocal}
                onChange={(event) =>
                  onChange({ ...draft, startLocal: event.target.value })
                }
              />
            </label>
            <label>
              End time ({timezone})
              <input
                type="datetime-local"
                value={draft.endLocal}
                onChange={(event) =>
                  onChange({ ...draft, endLocal: event.target.value })
                }
              />
            </label>
          </div>
          <div className="helper-row">
            <span className="pill">
              Duration: {durationHours() || "--"}
            </span>
            <span className="pill">
              UTC preview:{" "}
              {toUtcIso(draft.startLocal, timezone)
                ? DateTime.fromISO(toUtcIso(draft.startLocal, timezone)!)
                    .toUTC()
                    .toFormat("LLL dd, t")
                : "--"}
            </span>
          </div>
          <label>
            Attendees (comma separated)
            <input
              value={draft.attendees}
              onChange={(event) =>
                onChange({ ...draft, attendees: event.target.value })
              }
              placeholder="name@company.com, person@domain.com"
            />
          </label>
        </div>
        <div className="modal-footer">
          {mode === "edit" && onDelete && (
            <button className="danger" type="button" onClick={onDelete}>
              Delete event
            </button>
          )}
          <button className="primary" type="button" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
