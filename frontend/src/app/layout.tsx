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
    default: "EduMate — Modern Sairam Student Portal (SEC & SIT)",
    template: "%s | EduMate (SEC & SIT)"
  },
  description: "The consolidated, modern student dashboard for Sri Sairam Engineering College (SEC) and Sri Sairam Institute of Technology (SIT). Access student.sairam.edu.in and student.sairamit.edu.in services in one place.",
  applicationName: "EduMate",
  authors: [{ name: "Sairam Techno Incubator", url: "https://sairam.edu.in" }],
  generator: "Next.js",
  keywords: ["EduMate", "Sairam", "Sri Sairam Engineering College", "SEC", "Sri Sairam Institute of Technology", "SIT", "Student Portal", "Unified Dashboard", "Attendance", "Academic Reports", "student.sairam.edu.in", "student.sairamit.edu.in"],
  referrer: "origin-when-cross-origin",
  creator: "Sairam Techno Incubator",
  publisher: "Sri Sairam Engineering College",
  metadataBase: new URL('https://edumate-sairam.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "EduMate — Modern Sairam Student Portal (SEC & SIT)",
    description: "The unified modern dashboard for SEC and SIT students. Access attendance, marks, and more.",
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
    title: "EduMate — Modern Sairam Student Portal (SEC & SIT)",
    description: "The unified modern dashboard for SEC and SIT students. Access attendance, marks, and more.",
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

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "EduMate",
    "url": "https://edumate-sairam.vercel.app",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://edumate-sairam.vercel.app/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Sri Sairam Engineering College",
    "url": "https://edumate-sairam.vercel.app",
    "logo": "https://edumate-sairam.vercel.app/assets/SAIRAM-ROUND-LOGO.png",
    "sameAs": [
      "https://sairam.edu.in/",
      "https://sairamgroup.in/",
      "https://www.facebook.com/sairamec/",
      "https://in.linkedin.com/school/sri-sairam-engineering-college/",
      "https://www.instagram.com/sairamec/"
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "EduMate — Modern Sairam Student Portal",
    "operatingSystem": "Web, iOS, Android",
    "applicationCategory": "EducationalApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1250"
    }
  }
];

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
