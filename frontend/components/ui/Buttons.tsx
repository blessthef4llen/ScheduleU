// Reusable Buttons component for ScheduleU.
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function GradientButton(props: ButtonProps) {
  return <button {...props} className={`btn btn-primary ${props.className ?? ""}`.trim()} />;
}

export function SecondaryButton(props: ButtonProps) {
  return <button {...props} className={`btn btn-secondary ${props.className ?? ""}`.trim()} />;
}
