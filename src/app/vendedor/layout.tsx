import ProtectedRoute from '@/components/ProtectedRoute';

export default function VendedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireVendor={true}>
      {children}
    </ProtectedRoute>
  );
}

