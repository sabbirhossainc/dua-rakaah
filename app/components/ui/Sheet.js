"use client";
// A panel over the page, built on the native <dialog> (design D6). showModal() gives the focus trap, the inert page
// behind and Escape to close. Below 768px it rises from the bottom; from 768px it comes in from the side.
import { useEffect, useId, useRef } from "react";
import Button from "@/app/components/ui/Button";

/**
 * `open` and `onClose` control it. `closeLabel` names the close button in the page's language. The element that had the
 * focus when the sheet opened gets it back when it closes: older Safari does not do that itself. Mark a child with
 * `data-autofocus` to give it the focus on opening.
 */
export default function Sheet({ open, onClose, title, closeLabel, lang, children, className = "", ...props }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return undefined;
    const opener = document.activeElement;
    dialog.showModal();
    // The browser focuses the first control; an element marked data-autofocus takes the focus instead.
    dialog.querySelector("[data-autofocus]")?.focus();
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      lang={lang}
      aria-labelledby={titleId}
      // Escape: the state closes the dialog, so that the two never disagree.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // The browser can still close a dialog by itself (a second Escape). The state follows.
      onClose={() => {
        if (open && !dialogRef.current?.open) onClose();
      }}
      // A click on the dimmed page behind closes it. The dialog has no padding, so such a click lands on it.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={`sheet ${className}`}
      {...props}
    >
      <div data-sheet-body className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-card">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-heading text-card-title text-ink">
            {title}
          </h2>
          <Button
            variant="ghost"
            icon="close"
            aria-label={closeLabel}
            title={closeLabel}
            onClick={onClose}
            className="sheet-close"
          />
        </div>
        {children}
      </div>
    </dialog>
  );
}
