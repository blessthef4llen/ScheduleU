import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export function InputField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className ?? ""}`.trim()} />;
}

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field ${props.className ?? ""}`.trim()} />;
}
