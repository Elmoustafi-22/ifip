import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to your IFIP account to track your application, access training modules, and manage placements.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
