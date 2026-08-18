export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  required = false,
  defaultValue,
  options,
  hint,
  disabled = false,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  options: { value: string; label: string }[];
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        disabled={disabled}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-background disabled:text-muted"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function RadioField({
  label,
  name,
  required = false,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  options: { value: string; label: string; hint?: string }[];
  defaultValue?: string;
}) {
  return (
    <div className="text-sm">
      <span className="mb-2 block font-medium text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <div className="space-y-2">
        {options.map((o, i) => (
          <label key={o.value} className="flex items-start gap-2">
            <input
              type="radio"
              name={name}
              value={o.value}
              required={required}
              defaultChecked={
                defaultValue ? defaultValue === o.value : i === 0
              }
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block">{o.label}</span>
              {o.hint && (
                <span className="block text-xs text-muted">{o.hint}</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];
