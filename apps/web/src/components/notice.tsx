import { useEffect, useRef } from "react";

/**
 * A confirmation message. It takes focus when it appears, so screen readers
 * read it (a live region that is already filled when inserted is usually not
 * announced). Give it a new `key` to announce a new message.
 */
export function Notice({ children }: { children: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    <p
      ref={ref}
      tabIndex={-1}
      role="status"
      className="w-full rounded-md border px-4 py-3 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {children}
    </p>
  );
}
