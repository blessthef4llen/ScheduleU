// Reusable Togglefield component for ScheduleU.
import type { InputHTMLAttributes } from "react";

type ToggleFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export default function ToggleField({ label, ...props }: ToggleFieldProps) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#334155", fontSize: "0.88rem" }}>
      <input type="checkbox" {...props} />
      {label}
    </label>
  );
}
