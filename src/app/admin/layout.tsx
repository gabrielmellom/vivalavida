import ProtectedRoute from '@/components/ProtectedRoute';
import GlobalNotification from '@/components/GlobalNotification';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireAdmin={true}>
      <GlobalNotification />
      {children}
    </ProtectedRoute>
  );
}

