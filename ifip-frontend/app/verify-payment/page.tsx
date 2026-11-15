"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { HiCheckCircle, HiInformationCircle } from "react-icons/hi2";
import { TbLoader2 } from "react-icons/tb";
import { checkPaymentStatus } from "@/lib/api/services";

type Verification =
  | { status: "checking" | "missing" | "expired" | "unavailable" | "pending" | "offline" | "failed" | "cancelled" | "provider_failed" }
  | { status: "confirmed"; href: string; action: string; reference: string; pollingToken: string };

const checking: Verification = { status: "checking" };
const pollInterval = 2000;
const checkWindow = 40000;
const supportHref = "mailto:ifip.program@gmail.com";
const primaryAction = "inline-flex min-h-11 items-center justify-center rounded-[7px] bg-[#101f3f] px-5 py-2.5 text-center text-sm font-semibold text-on-primary hover:bg-[#24395f] motion-safe:transition-colors focus-visible:outline-primary";
const secondaryAction = "inline-flex min-h-11 items-center text-sm font-semibold text-secondary underline underline-offset-4";

const statusCopy: Record<Verification["status"], { title: string; message: string }> = {
  checking: { title: "Checking your payment", message: "We’re checking the result with the payment provider." },
  confirmed: { title: "Payment confirmed", message: "IFIP has confirmed your commitment levy." },
  failed: { title: "Payment unsuccessful", message: "IFIP received an unsuccessful result for this payment. If your bank shows a charge, contact IFIP support before paying again." },
  cancelled: { title: "Checkout was cancelled", message: "The payment provider reported that checkout was cancelled. If your bank shows a charge, contact IFIP support before paying again." },
  provider_failed: { title: "The provider reported a payment issue", message: "IFIP couldn’t confirm the final result. If your bank shows a charge, contact IFIP support before paying again." },
  missing: { title: "Payment details unavailable", message: "This browser is missing the details needed to check your payment. Return using the browser you used for checkout, or check your email for IFIP instructions." },
  expired: { title: "Payment check link unavailable", message: "The saved verification details have expired or do not match this payment. Check your email for instructions or contact IFIP support." },
  unavailable: { title: "Payment record unavailable", message: "IFIP couldn’t find this payment reference. Check your email for instructions or contact IFIP support before making another payment." },
  pending: { title: "Payment is still being checked", message: "IFIP is still waiting for a final result. Check the same payment again. If your bank shows a charge, contact IFIP support before making another payment." },
  offline: { title: "We couldn’t reach payment verification", message: "Your payment result is still unconfirmed. Check your connection and try checking the same payment again." },
};

function VerificationPanel({ result, onRetry, onContinue }: {
  result: Verification;
  onRetry?: () => void;
  onContinue?: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { status } = result;
  const { title, message } = statusCopy[status];
  const busy = status === "checking";
  const confirmed = status === "confirmed";
  const retryable = status === "pending" || status === "offline" || status === "provider_failed";
  const canReturn = status === "failed" || status === "cancelled";

  useEffect(() => {
    if (status !== "checking") heading.current?.focus();
  }, [status]);

  return (
    <div className="min-h-dvh bg-[#eef4fa] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-xl flex-col gap-8">
        <Link href="/" className="w-fit rounded-sm" aria-label="IFIP home">
          <Image src="/images/logos/logo-full-color.png" width={160} height={44} alt="" priority className="h-auto w-36" />
        </Link>
        <section aria-labelledby="payment-heading" className="space-y-5 rounded-2xl border border-[#cbd8e8] bg-white p-5 sm:p-9">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#e1f1fb] text-[#12617e]">
            {busy ? <TbLoader2 aria-hidden="true" className="size-6 motion-safe:animate-spin" />
              : confirmed ? <HiCheckCircle aria-hidden="true" className="size-6" />
                : <HiInformationCircle aria-hidden="true" className="size-6" />}
          </div>
          <div className="space-y-2">
            <h1 id="payment-heading" ref={heading} tabIndex={-1} className="font-sans text-3xl leading-tight tracking-tight text-[#101f3f] sm:text-4xl font-semibold">{title}</h1>
            <p className="text-sm leading-relaxed text-on-surface-variant sm:text-base">{message}</p>
          </div>
          <p role="status" className="sr-only">{busy ? title : ""}</p>
          {confirmed && (
            <p className="text-sm text-on-surface-variant">
              {result.action === "Set your password" ? "Set a password to access your account." : "Open your saved application to check the next step. If it’s unavailable, check your email or contact IFIP support."}
            </p>
          )}
          {status === "offline" && <p className="text-sm text-on-surface-variant">If your bank shows a charge, contact IFIP support before making another payment.</p>}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {confirmed && <Link href={result.href} onClick={(event) => {
              if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onContinue?.();
            }} className={primaryAction}>{result.action}</Link>}
            {retryable && <button type="button" onClick={onRetry} className={primaryAction}>Check payment again</button>}
            {canReturn && <Link href="/apply" className={primaryAction}>Return to application</Link>}
            <a href={supportHref} className={secondaryAction}>Email IFIP support</a>
          </div>
        </section>
      </div>
    </div>
  );
}

function VerifyPaymentContent() {
  const params = useSearchParams();
  return (
    <PaymentCheck
      key={params.toString()}
      referenceFromUrl={params.get("reference") || params.get("trxref") || params.get("tx_ref")}
      transactionId={params.get("transaction_id") || params.get("id")}
      providerStatus={params.get("status")}
    />
  );
}

function PaymentCheck({ referenceFromUrl, transactionId, providerStatus }: {
  referenceFromUrl: string | null;
  transactionId: string | null;
  providerStatus: string | null;
}) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Verification>(checking);
  const savedCheck = useRef<{ reference: string; pollingToken: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let pollTimer: number | undefined;
    let deadline: number | undefined;
    let lastResult: "pending" | "offline" = "offline";
    const providerCancelled = providerStatus === "cancelled";
    const providerFailed = providerStatus === "failed";

    const finish = (next: Verification) => {
      if (controller.signal.aborted) return;
      window.clearTimeout(pollTimer);
      window.clearTimeout(deadline);
      setResult(next);
      controller.abort();
    };

    const poll = async (reference: string, pollingToken: string) => {
      try {
        // Forward the provider outcome on the first check. An explicit retry rechecks the reference.
        const data = await checkPaymentStatus(reference, pollingToken, transactionId, attempt === 0 ? providerStatus : null, controller.signal);
        if (controller.signal.aborted) return;
        if (data.status === "success") {
          finish({
            status: "confirmed",
            href: data.setPasswordToken ? "/set-password?" + new URLSearchParams({ token: data.setPasswordToken }) : "/apply?payment=verified",
            action: data.setPasswordToken ? "Set your password" : "Continue application",
            reference,
            pollingToken,
          });
          return;
        }
        if (data.status === "failed") {
          finish({ status: providerCancelled ? "cancelled" : "failed" });
          return;
        }
        if (providerCancelled && attempt === 0) {
          finish({ status: "cancelled" });
          return;
        }
        if (providerFailed && attempt === 0) {
          finish({ status: "provider_failed" });
          return;
        }
        lastResult = "pending";
      } catch (error) {
        if (controller.signal.aborted) return;
        const status = error instanceof Error && "status" in error ? error.status : undefined;
        if (status === 401 || status === 403 || status === 404) {
          finish({ status: status === 404 ? "unavailable" : "expired" });
          return;
        }
        if (providerCancelled && attempt === 0) {
          finish({ status: "cancelled" });
          return;
        }
        if (providerFailed && attempt === 0) {
          finish({ status: "provider_failed" });
          return;
        }
        lastResult = "offline";
      }
      pollTimer = window.setTimeout(() => void poll(reference, pollingToken), pollInterval);
    };

    // Let Strict Mode discard its initial effect before sending a request.
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      const reference = savedCheck.current?.reference || referenceFromUrl || localStorage.getItem("paymentReference");
      const pollingToken = savedCheck.current?.pollingToken || localStorage.getItem("paymentPollingToken");
      if (!reference || !pollingToken) {
        finish({ status: "missing" });
        return;
      }
      savedCheck.current = { reference, pollingToken };
      deadline = window.setTimeout(() => finish({
        status: attempt === 0 && providerCancelled ? "cancelled"
          : attempt === 0 && providerFailed ? "provider_failed"
            : lastResult,
      }), checkWindow);
      void poll(reference, pollingToken);
    });

    return () => {
      controller.abort();
      window.clearTimeout(pollTimer);
      window.clearTimeout(deadline);
    };
  }, [attempt, providerStatus, referenceFromUrl, transactionId]);

  const retry = () => {
    setResult(checking);
    setAttempt((previous) => previous + 1);
  };

  const continueAfterPayment = () => {
    if (result.status !== "confirmed") return;
    // Another checkout may have replaced these values in a different tab.
    if (localStorage.getItem("paymentReference") === result.reference &&
        localStorage.getItem("paymentPollingToken") === result.pollingToken) {
      localStorage.removeItem("paymentReference");
      localStorage.removeItem("paymentPollingToken");
    }
  };

  return <VerificationPanel result={result} onRetry={retry} onContinue={continueAfterPayment} />;
}

export default function VerifyPaymentPage() {
  return (
    <Suspense fallback={<VerificationPanel result={checking} />}>
      <VerifyPaymentContent />
    </Suspense>
  );
}
