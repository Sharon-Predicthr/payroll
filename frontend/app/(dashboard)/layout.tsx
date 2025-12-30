// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout is minimal - providers are in the page component
  return <>{children}</>;
}

