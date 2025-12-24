import { TIMEZONES, TimezoneValue } from "../timezone";

type Props = {
  value: TimezoneValue;
  onChange: (value: TimezoneValue) => void;
};

const TimezoneToggle = ({ value, onChange }: Props) => {
  return (
    <div className="tz-toggle">
      {TIMEZONES.map((tz) => (
        <button
          key={tz.value}
          type="button"
          className={value === tz.value ? "active" : ""}
          onClick={() => onChange(tz.value)}
        >
          <span className="tz-label">{tz.label}</span>
          {value === tz.value && <span className="tz-active">Active</span>}
        </button>
      ))}
    </div>
  );
};

export default TimezoneToggle;
