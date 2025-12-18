'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireVendor?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireVendor = false,
}: ProtectedRouteProps) {
  const { user, userRole, loading, isAdmin, isVendor } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }

      if (requireAdmin && !isAdmin) {
        router.push('/vendedor');
        return;
      }

      if (requireVendor && !isVendor) {
        router.push('/login');
        return;
      }
    }
  }, [user, loading, isAdmin, isVendor, requireAdmin, requireVendor, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-viva-blue mx-auto mb-4"></div>
          <p className="text-viva-blue-dark">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return null;
  }

  if (requireVendor && !isVendor) {
    return null;
  }

  return <>{children}</>;
}

