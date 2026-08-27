import type { ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type Common = {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
};

function Shell({
  name,
  label,
  hint,
  className,
  children,
}: Common & { children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextField({
  defaultValue,
  value,
  onChange,
  type = "text",
  placeholder,
  ...common
}: Common & {
  defaultValue?: string | number | null;
  value?: string | number | null;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: "text" | "number" | "url" | "email";
  placeholder?: string;
}) {
  // Controlled when `value` is passed (e.g. a field whose content must
  // survive a sibling field swapping it out for a different component),
  // uncontrolled otherwise — same as every other field here.
  const controlled =
    value !== undefined
      ? { value: value ?? "", onChange }
      : { defaultValue: defaultValue ?? "" };
  return (
    <Shell {...common}>
      <Input
        id={common.name}
        name={common.name}
        type={type}
        required={common.required}
        placeholder={placeholder}
        {...controlled}
        autoComplete="off"
        className="h-11"
      />
    </Shell>
  );
}

export function TextAreaField({
  defaultValue,
  rows = 4,
  placeholder,
  ...common
}: Common & {
  defaultValue?: string | null;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <Shell {...common}>
      <Textarea
        id={common.name}
        name={common.name}
        rows={rows}
        required={common.required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
      />
    </Shell>
  );
}

export function SelectField({
  defaultValue,
  value,
  options,
  onChange,
  ...common
}: Common & {
  defaultValue?: string | null;
  value?: string | null;
  options: { value: string; label: string }[];
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  // A native <select> rather than the radix Select: it posts its value with
  // the form without a hidden-input dance, which is all the admin needs.
  // Controlled when `value` is passed (e.g. a field whose content must
  // survive a sibling field swapping it out for a different component),
  // uncontrolled otherwise.
  const controlled =
    value !== undefined
      ? { value: value ?? options[0]?.value }
      : { defaultValue: defaultValue ?? options[0]?.value };
  return (
    <Shell {...common}>
      <select
        id={common.name}
        name={common.name}
        {...controlled}
        required={common.required}
        onChange={onChange}
        className="h-11 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}

export function CheckboxField({
  defaultChecked,
  label,
  name,
  hint,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Checkbox id={name} name={name} defaultChecked={defaultChecked} />
        <Label htmlFor={name}>{label}</Label>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Arrays are edited as one-per-line text — no JSON in the admin UI. */
export function ListField({
  defaultValue,
  rows = 4,
  ...common
}: Common & { defaultValue?: string[] | null; rows?: number }) {
  return (
    <TextAreaField
      {...common}
      rows={rows}
      defaultValue={(defaultValue ?? []).join("\n")}
      hint={common.hint ?? "One per line."}
    />
  );
}

export function parseList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
