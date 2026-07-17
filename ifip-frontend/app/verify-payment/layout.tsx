import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Payment",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VerifyPaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
