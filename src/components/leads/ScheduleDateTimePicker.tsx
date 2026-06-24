"use client";

const TIME_PRESETS = [
  { label: "8:00 AM", hour: 8, minute: 0 },
  { label: "9:00 AM", hour: 9, minute: 0 },
  { label: "10:00 AM", hour: 10, minute: 0 },
  { label: "11:00 AM", hour: 11, minute: 0 },
  { label: "12:00 PM", hour: 12, minute: 0 },
  { label: "1:00 PM", hour: 13, minute: 0 },
  { label: "2:00 PM", hour: 14, minute: 0 },
  { label: "3:00 PM", hour: 15, minute: 0 },
  { label: "4:00 PM", hour: 16, minute: 0 },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function defaultDateValue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function defaultScheduleDateTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return `${defaultDateValue()}T09:00`;
}

interface ScheduleDateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ScheduleDateTimePicker({
  value,
  onChange,
}: ScheduleDateTimePickerProps) {
  const [datePart, timePart] = value.includes("T")
    ? value.split("T")
    : [defaultDateValue(), "09:00"];

  function setDate(nextDate: string) {
    onChange(`${nextDate}T${timePart || "09:00"}`);
  }

  function setTime(nextTime: string) {
    onChange(`${datePart}T${nextTime}`);
  }

  function applyPreset(hour: number, minute: number) {
    setTime(`${pad(hour)}:${pad(minute)}`);
  }

  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  })();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-field-cream/70 mb-1.5">
          Date
        </label>
        <input
          type="date"
          value={datePart}
          min={todayStr}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full min-h-[44px] rounded-lg border border-field-line/30 bg-field-turf/10 px-3 py-2.5 text-base text-field-cream focus:outline-none focus:ring-2 focus:ring-field-gold/40 [color-scheme:dark]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-field-cream/70 mb-1.5">
          Time
        </label>
        <input
          type="time"
          value={timePart}
          onChange={(e) => setTime(e.target.value)}
          required
          className="w-full min-h-[44px] rounded-lg border border-field-line/30 bg-field-turf/10 px-3 py-2.5 text-base text-field-cream focus:outline-none focus:ring-2 focus:ring-field-gold/40 [color-scheme:dark]"
        />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {TIME_PRESETS.map((preset) => {
            const presetValue = `${pad(preset.hour)}:${pad(preset.minute)}`;
            const active = timePart === presetValue;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.hour, preset.minute)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  active
                    ? "bg-field-gold text-field-dark"
                    : "bg-field-turf/25 text-field-cream/60 hover:bg-field-turf/40 hover:text-field-cream"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}