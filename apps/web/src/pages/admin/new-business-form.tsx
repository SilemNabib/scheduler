import { type FormEvent, useState } from "react";
import { FormField } from "@/components/form-field";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { ApiError, useApi } from "@/lib/api";
import { useFocusFirstError } from "@/lib/use-focus-first-error";

type Field = "slug" | "name" | "ownerEmail";
type FieldErrors = Partial<Record<Field, string>>;

/** Form order, used to focus the first field with an error. */
const FIELDS: Field[] = ["slug", "name", "ownerEmail"];

/** Spanish text for the API's error codes. */
const MESSAGES: Record<string, string> = {
  SLUG_INVALID: "Usa de 3 a 40 caracteres: letras minúsculas sin tildes, números y guiones.",
  SLUG_RESERVED: "Esa dirección está reservada. Elige otra.",
  SLUG_TAKEN: "Otro negocio ya usa esa dirección.",
  NAME_REQUIRED: "Escribe el nombre del negocio.",
  NAME_TOO_LONG: "Usa como máximo 80 caracteres.",
  EMAIL_INVALID: "Escribe un correo válido.",
  OWNER_EMAIL_IN_USE: "Ese correo ya es el dueño de otro negocio.",
  OWNER_EMAIL_HAS_ACCOUNT: "Ya existe una cuenta con ese correo.",
  INVITATION_ALREADY_PENDING: "Ese correo ya tiene una invitación pendiente.",
};

const GENERIC_ERROR = "No pudimos crear el negocio. Inténtalo de nuevo.";
const INVITATION_FAILED = "No pudimos enviar la invitación. El negocio no se creó; inténtalo de nuevo.";

/** OPE-02: create a business with its pending owner, who gets an invitation. */
export function NewBusinessForm() {
  const api = useApi();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useFocusFirstError(errors, FIELDS);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = {
      slug: String(data.get("slug") ?? ""),
      name: String(data.get("name") ?? ""),
      ownerEmail: String(data.get("ownerEmail") ?? ""),
    };

    setErrors({});
    setFormError(null);
    setCreated(null);
    setSaving(true);
    try {
      const result = await api<{ ownerEmail: string }>("/admin/businesses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      form.reset();
      setCreated(`Negocio creado. Enviamos la invitación a ${result.ownerEmail}.`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION") {
        const fields: FieldErrors = {};
        for (const field of FIELDS) {
          const code = error.fields[field];
          if (code) fields[field] = MESSAGES[code] ?? GENERIC_ERROR;
        }
        setErrors(fields);
      } else if (error instanceof ApiError && error.code === "INVITATION_FAILED") {
        setFormError(INVITATION_FAILED);
      } else {
        setFormError(GENERIC_ERROR);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="new-business-title">
      <h2 id="new-business-title" className="text-lg font-semibold">
        Nuevo negocio
      </h2>

      {/* A new key per message, so each confirmation takes focus and is announced. */}
      {created && <Notice key={created}>{created}</Notice>}

      <form className="flex max-w-sm flex-col gap-4" onSubmit={onSubmit} noValidate>
        <FormField
          name="slug"
          label="Dirección (slug)"
          hint="La página de reservas quedará en /{slug}."
          autoComplete="off"
          error={errors.slug}
        />
        <FormField name="name" label="Nombre del negocio" autoComplete="off" error={errors.name} />
        <FormField
          name="ownerEmail"
          label="Correo del dueño"
          type="email"
          autoComplete="off"
          error={errors.ownerEmail}
        />

        {formError && (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Creando…" : "Crear negocio e invitar al dueño"}
        </Button>
      </form>
    </section>
  );
}
