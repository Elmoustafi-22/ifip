import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner Application",
  description: "Partner with the Islamic Finance Internship Program (IFIP) to access top-tier talent trained in Islamic finance, sharia audits, and ethical investment.",
};

export default function PartnersApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
