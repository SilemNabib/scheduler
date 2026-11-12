import { Input } from "@/components/ui/input";

/**
 * A labeled input with an optional hint and its error next to it. The input id
 * is `name`, so useFocusFirstError can focus it.
 */
export function FormField({
  name,
  label,
  hint,
  type = "text",
  autoComplete,
  error,
}: {
  name: string;
  label: string;
  hint?: string;
  type?: string;
  autoComplete?: string;
  error?: string;
}) {
  const hintId = `${name}-hint`;
  const errorId = `${name}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
