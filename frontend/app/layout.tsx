import "./globals.css";

// Root layout - Next.js requires html/body tags here
// The locale-specific layout wraps the content with i18n provider
// Fonts are loaded via CSS in globals.css to avoid build-time network dependency
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
