interface FormFieldProps {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
  placeholder,
  className = "",
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      <input
        type={type}
        className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${readOnly ? "bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed" : ""} ${className}`}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
      />
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  readOnly = false,
  placeholder,
  rows = 3,
  className = "",
}: Omit<FormFieldProps, "type"> & { rows?: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      <textarea
        className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${readOnly ? "bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed" : ""} ${className}`}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}

export function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 cursor-not-allowed"
        value={value}
        readOnly
      />
    </div>
  );
}
