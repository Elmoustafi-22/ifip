import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply for Cohort",
  description: "Apply for the Islamic Finance Internship Program (IFIP). Fill out your details and take the next step in your ethical finance career.",
};

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
