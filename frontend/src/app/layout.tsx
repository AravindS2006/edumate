import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EduMate — Sairam Student Portal",
    template: "%s | EduMate"
  },
  description: "A premium student dashboard for Sri Sairam Engineering College. View attendance, academic reports, and more.",
  applicationName: "EduMate",
  authors: [{ name: "Sairam Techno Incubator", url: "https://sairam.edu.in" }],
  generator: "Next.js",
  keywords: ["EduMate", "Sairam", "Student Portal", "Attendance", "Academic Reports", "Engineering College"],
  referrer: "origin-when-cross-origin",
  creator: "Sairam Techno Incubator",
  publisher: "Sri Sairam Engineering College",
  metadataBase: new URL('https://edumate-sairam.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "EduMate — Sairam Student Portal",
    description: "Access your student profile, attendance, and academic records seamlessly.",
    url: "https://edumate-sairam.vercel.app",
    siteName: "EduMate",
    images: [
      {
        url: "/assets/SAIRAM-ROUND-LOGO.png",
        width: 800,
        height: 800,
        alt: "EduMate Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduMate — Sairam Student Portal",
    description: "Access your student profile, attendance, and academic records seamlessly.",
    images: ["/assets/SAIRAM-ROUND-LOGO.png"],
    creator: "@sairam_institutions",
  },
  manifest: "/manifest.json",
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
  verification: {
    google: "google5e8b40ebc0a4327a",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0f172a",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "EduMate",
  "url": "https://edumate-sairam.vercel.app",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://edumate-sairam.vercel.app/?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={plusJakarta.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
