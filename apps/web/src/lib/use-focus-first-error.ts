import { useEffect } from "react";

/**
 * When errors appear, moves focus to the first field (in `order`) that has
 * one, so screen readers read it. Fields are found by id (see FormField).
 */
export function useFocusFirstError<F extends string>(errors: Partial<Record<F, string>>, order: readonly F[]) {
  useEffect(() => {
    const first = order.find((field) => errors[field]);
    if (first) document.getElementById(first)?.focus();
  }, [errors, order]);
}
