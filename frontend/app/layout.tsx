import "./globals.css";
import { Inter, Noto_Sans_Hebrew, Noto_Sans_Arabic } from "next/font/google";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew"],
  display: "swap",
  variable: "--font-hebrew",
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-arabic",
});

// Root layout - Next.js requires html/body tags here
// The locale-specific layout wraps the content with i18n provider
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={`${inter.variable} ${notoSansHebrew.variable} ${notoSansArabic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
