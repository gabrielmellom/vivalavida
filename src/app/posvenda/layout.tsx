import ProtectedRoute from '@/components/ProtectedRoute';

export default function PosVendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requirePostSale={true}>
      {children}
    </ProtectedRoute>
  );
}

