import { esES } from "@clerk/localizations";
import { useReverification, useUser } from "@clerk/react";
import { isClerkAPIResponseError, isReverificationCancelledError } from "@clerk/react/errors";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { FormField } from "@/components/form-field";
import { RequireSignedIn } from "@/components/require-signed-in";
import { Button } from "@/components/ui/button";
import { useFocusFirstError } from "@/lib/use-focus-first-error";
import type { PanelNotice } from "./panel-page";

type Field = "currentPassword" | "newPassword" | "confirmPassword";
type FieldErrors = Partial<Record<Field, string>>;

/** Form order, used to focus the first field with an error. */
const FIELDS: Field[] = ["currentPassword", "newPassword", "confirmPassword"];

/** Clerk's parameter names for the fields it validates. */
const CLERK_PARAMS: Record<string, Field> = {
  current_password: "currentPassword",
  new_password: "newPassword",
};

const GENERIC_ERROR = "No pudimos cambiar tu contraseña. Inténtalo de nuevo.";

/** Used when Clerk's Spanish texts have no message for an error code. */
const FIELD_FALLBACK: Record<Field, string> = {
  currentPassword: "Revisa tu contraseña actual.",
  newPassword: "Esta contraseña no se puede usar. Prueba con otra.",
  confirmPassword: "Revisa la confirmación.",
};

/** Clerk's own Spanish message for an error code, if it has one. */
function clerkMessage(code: string): string | undefined {
  const message = (esES.unstable__errors as Record<string, unknown> | undefined)?.[code];
  return typeof message === "string" ? message : undefined;
}

/** Turns every Clerk error into a message next to its field, or a form message. */
function toErrors(error: unknown): { fields: FieldErrors; form: string | null } {
  if (!isClerkAPIResponseError(error) || error.errors.length === 0) {
    return { fields: {}, form: GENERIC_ERROR };
  }
  const fields: FieldErrors = {};
  let form: string | null = null;
  for (const { code, meta } of error.errors) {
    const field = meta?.paramName ? CLERK_PARAMS[meta.paramName] : undefined;
    if (field) fields[field] ??= clerkMessage(code) ?? FIELD_FALLBACK[field];
    else form ??= clerkMessage(code) ?? GENERIC_ERROR;
  }
  return { fields, form };
}

/** Checks that need no request to Clerk. */
function validate(currentPassword: string, newPassword: string, confirmPassword: string): FieldErrors {
  const fields: FieldErrors = {};
  if (!currentPassword) fields.currentPassword = "Escribe tu contraseña actual.";
  if (!newPassword) fields.newPassword = "Escribe la nueva contraseña.";
  else if (newPassword !== confirmPassword) fields.confirmPassword = "Las contraseñas no coinciden.";
  return fields;
}

export function ChangePasswordPage() {
  return (
    <RequireSignedIn>
      <ChangePasswordForm />
    </RequireSignedIn>
  );
}

function ChangePasswordForm() {
  const { user } = useUser();
  // Clerk may ask the user to confirm their identity before a sensitive change.
  const updatePassword = useReverification(
    (params: { currentPassword: string; newPassword: string }) =>
      user!.updatePassword({ ...params, signOutOfOtherSessions: true }),
  );
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusFirstError(errors, FIELDS);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    setFormError(null);
    const localErrors = validate(currentPassword, newPassword, confirmPassword);
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    setSaving(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      // The panel shows the confirmation (see PanelNotice).
      navigate("/panel", { state: { notice: "Contraseña actualizada." } satisfies PanelNotice });
    } catch (error) {
      setSaving(false);
      // Closing Clerk's identity check is the user's choice, not a failure.
      if (isReverificationCancelledError(error)) return;
      const result = toErrors(error);
      setErrors(result.fields);
      setFormError(result.form);
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Cambiar contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Al cambiarla, se cerrará tu sesión en los demás dispositivos.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <FormField
          type="password"
          name="currentPassword"
          label="Contraseña actual"
          autoComplete="current-password"
          error={errors.currentPassword}
        />
        <FormField
          type="password"
          name="newPassword"
          label="Nueva contraseña"
          autoComplete="new-password"
          error={errors.newPassword}
        />
        <FormField
          type="password"
          name="confirmPassword"
          label="Confirmar la nueva contraseña"
          autoComplete="new-password"
          error={errors.confirmPassword}
        />

        {formError && (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </form>

      <Link to="/panel" className="text-sm underline underline-offset-4">
        Volver al panel
      </Link>
    </main>
  );
}
