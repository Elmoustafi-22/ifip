"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function PendingDialog({ labelledBy, onDismiss, busy, drawer, children }: {
  labelledBy: string;
  onDismiss: () => void;
  busy?: boolean;
  drawer?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={event => {
        event.preventDefault();
        if (!busy) onDismiss();
      }}
      className={drawer
        ? "fixed inset-y-0 end-0 start-auto m-0 h-dvh max-h-dvh w-full max-w-2xl overflow-hidden bg-white p-0 shadow-xl backdrop:bg-slate-900/60"
        : "fixed inset-0 m-auto max-h-[90dvh] w-[94vw] max-w-xl overflow-y-auto rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/60"}
    >
      {children}
    </dialog>
  );
}
