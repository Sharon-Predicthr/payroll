import "./globals.css";

export const metadata = {
  title: "Payroll System",
  description: "Payroll SaaS Application"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he">
      <body>{children}</body>
    </html>
  );
}
