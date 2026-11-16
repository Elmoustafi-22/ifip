"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { authClient, registerAdminPasswordPrompt, type AdminPasswordProof } from "@/lib/api/client";

type PendingConfirmation = {
  resolve: (proof: AdminPasswordProof) => void;
  reject: (error: Error) => void;
};

export default function AdminPasswordDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<PendingConfirmation[]>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unregister = registerAdminPasswordPrompt(() => new Promise((resolve, reject) => {
      const confirmation = { resolve, reject };
      if (pending.current) {
        pending.current.push(confirmation);
        return;
      }
      pending.current = [confirmation];
      setError("");
      dialog.current?.showModal();
      input.current?.focus();
    }));
    return () => {
      unregister();
      pending.current?.forEach(({ reject }) => reject(new Error("Password confirmation was canceled.")));
      pending.current = null;
    };
  }, []);

  function cancel() {
    if (verifying) return;
    if (input.current) input.current.value = "";
    dialog.current?.close();
    pending.current?.forEach(({ reject }) => reject(new Error("Password confirmation was canceled.")));
    pending.current = null;
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = pending.current;
    const field = input.current;
    if (!request || !field || verifying) return;

    setVerifying(true);
    setError("");
    const password = field.value;
    field.value = "";
    try {
      const { data } = await authClient.post<AdminPasswordProof>("/admin/confirm-password", { password });
      if (pending.current !== request) return;
      pending.current = null;
      dialog.current?.close();
      request.forEach(({ resolve }) => resolve(data));
    } catch (cause) {
      if (pending.current !== request) return;
      setError(cause instanceof Error ? cause.message : "Could not confirm your password. Try again.");
      field.focus();
    } finally {
      setVerifying(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="admin-confirm-password-title"
      aria-describedby="admin-confirm-password-description"
      onCancel={(event) => { event.preventDefault(); cancel(); }}
      className="fixed inset-0 m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/50"
    >
      <h2 id="admin-confirm-password-title" className="text-lg font-bold text-[#000666]">Confirm your password</h2>
      <p id="admin-confirm-password-description" className="mt-2 text-sm text-slate-600">
        Enter your current password to continue with this action.
      </p>
      <form className="mt-5 space-y-4" onSubmit={confirm}>
        <label className="block space-y-1 text-sm font-semibold text-slate-700">
          <span>Current password</span>
          <input
            ref={input}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            readOnly={verifying}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "admin-confirm-password-error" : undefined}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
        </label>
        {error && <p id="admin-confirm-password-error" role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={verifying} onClick={cancel} className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={verifying} className="min-h-10 rounded-lg bg-[#000666] px-4 text-sm font-semibold text-white disabled:opacity-60">
            {verifying ? "Confirming…" : "Confirm and continue"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
