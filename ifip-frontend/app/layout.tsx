import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://ifip.nextif.org"),
  title: {
    default: "Islamic Finance Internship Program (IFIP) | Apply Now",
    template: "%s | IFIP",
  },
  description: "Join the Islamic Finance Internship Program (IFIP). Empowering the next generation of leaders in ethical and Islamic finance through structured training, expert mentorship, and premium placement opportunities.",
  keywords: [
    "Islamic finance",
    "ethical finance",
    "internship program",
    "finance internship",
    "sharia banking",
    "sharia audit",
    "takaful",
    "sukuk",
    "ethical investment",
    "career placement",
    "finance training",
    "Nigeria finance internships",
    "IFIP",
    "Islamic Finance Internship Program",
    "NextIF",
  ],
  authors: [{ name: "IFIP" }],
  creator: "IFIP",
  publisher: "IFIP",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Islamic Finance Internship Program (IFIP) | Apply Now",
    description: "Empowering the next generation of leaders in ethical and Islamic finance through structured training, expert mentorship, and premium placement opportunities.",
    url: "https://ifip.nextif.org",
    siteName: "IFIP",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/logos/logo-on-blue-gradient.png",
        width: 1200,
        height: 630,
        alt: "Islamic Finance Internship Program (IFIP) Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Islamic Finance Internship Program (IFIP) | Apply Now",
    description: "Empowering the next generation of leaders in ethical and Islamic finance through structured training, expert mentorship, and premium placement opportunities.",
    images: ["/images/logos/logo-on-blue-gradient.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "Islamic Finance Internship Program (IFIP)",
  "url": "https://ifip.nextif.org",
  "logo": "https://ifip.nextif.org/images/logos/logo-full-color.png",
  "description": "Islamic Finance Internship Program (IFIP) is a premier structured training and placement platform empowering the next generation of ethical and Islamic finance leaders.",
  "sameAs": [
    "https://www.linkedin.com/company/islamic-finance-internship-program/"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "partnerships@ifip.ng",
    "contactType": "partnerships"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-[#000666] text-white px-4 py-2 rounded-md font-bold shadow-md focus:outline-none"
        >
          Skip to main content
        </a>
        <main id="main-content" className="flex-1 flex flex-col" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
