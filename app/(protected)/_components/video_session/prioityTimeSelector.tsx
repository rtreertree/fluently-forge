"use client";

import { useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";

type PriorityTimeSelectorProps = {
  name: string;
  label: string;
};

const PriorityTimeSelector = ({ name, label }: PriorityTimeSelectorProps) => {
  const { control, setError, clearErrors, watch, setValue, formState } = useFormContext();

  const startDate = watch(`${name}.startDate`);
  const startTime = watch(`${name}.startTime`);
  const endDate = watch(`${name}.endDate`);
  const endTime = watch(`${name}.endTime`);

  const startISO = startDate && startTime ? `${startDate}T${startTime}` : "";
  const endISO = endDate && endTime ? `${endDate}T${endTime}` : "";

  let durationLabel = "";
  if (startISO && endISO) {
    const start = new Date(startISO);
    const end = new Date(endISO);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs > 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
      durationLabel = `Duration: ${diffHours}h ${diffMinutes}m`;
    }
  }

  useEffect(() => {
    if (startISO && endISO) {
      const start = new Date(startISO);
      const end = new Date(endISO);
      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours <= 0) {
        setError(`${name}.endTime`, {
          type: "manual",
          message: "End must be after start",
        });
      } else if (diffMs > 30 * 60 * 1000) {
        setError(`${name}.endTime`, {
          type: "manual",
          message: "Duration must not exceed 30 minutes",
        });
      } else {
        clearErrors(`${name}.endTime`);
      }
    }
  }, [startISO, endISO, name, setError, clearErrors]);

  useEffect(() => {
    if (startDate && endDate && endDate < startDate) {
      setValue(`${name}.endDate`, startDate);
    }
    if (startDate === endDate && startTime && endTime && endTime < startTime) {
      setValue(`${name}.endTime`, startTime);
    }
  }, [startDate, startTime, endDate, endTime, name, setValue]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">{label}</label>
      <div className="flex gap-4 items-start">
        {/* Start */}
        <div className="flex flex-col items-center flex-1">
          <span className="text-xs text-gray-500 mb-1">Start</span>
          <Controller
            name={`${name}.startDate`}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <input
                type="date"
                {...field}
                className="border rounded px-2 py-1 pr-8 w-full"
                required
                min={today}
                style={{ paddingRight: 32 }}
              />
            )}
          />
          <Controller
            name={`${name}.startTime`}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <input
                type="time"
                {...field}
                className="border rounded px-2 py-1 pr-8 w-full"
                required
                style={{ paddingRight: 32 }}
              />
            )}
          />
        </div>
        <span className="mx-2 mt-7">-</span>
        {/* End */}
        <div className="flex flex-col items-center flex-1">
          <span className="text-xs text-gray-500 mb-1">End</span>
          <Controller
            name={`${name}.endDate`}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <input
                type="date"
                {...field}
                className="border rounded px-2 py-1 pr-8 w-full"
                required
                min={startDate || today}
                style={{ paddingRight: 32 }}
              />
            )}
          />
          <Controller
            name={`${name}.endTime`}
            control={control}
            defaultValue=""
            render={({ field, fieldState }) => (
              <>
                <input
                  type="time"
                  {...field}
                  className="border rounded px-2 py-1 pr-8 w-full"
                  min={startDate === endDate && startTime ? startTime : undefined}
                  required
                  style={{ paddingRight: 32 }}
                />
                <div style={{ height: 38 }}>
                  <span className="block text-red-500 text-xs" style={{ minHeight: 18 }}>
                    {fieldState.error?.message || "\u00A0"}
                  </span>
                  <span className="block text-xs" style={{ minHeight: 18 }}>
                    {durationLabel || "\u00A0"}
                  </span>
                </div>
              </>
            )}
          />
        </div>
      </div>
      {formState.errors[name]?.message && (
        <div className="text-red-500 text-sm mb-2">
          {formState.errors[name]?.message as string}
        </div>
      )}
    </div>
  );
};

export default PriorityTimeSelector;