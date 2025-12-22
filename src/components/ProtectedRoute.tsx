'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireVendor?: boolean;
  requirePostSale?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireVendor = false,
  requirePostSale = false,
}: ProtectedRouteProps) {
  const { user, userRole, loading, isAdmin, isVendor, isPostSale } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }

      if (requireAdmin && !isAdmin) {
        // Redirecionar baseado no tipo de usuário
        if (userRole?.role === 'post_sale') {
          router.push('/posvenda');
        } else {
          router.push('/vendedor');
        }
        return;
      }

      if (requireVendor && !isVendor) {
        router.push('/login');
        return;
      }

      if (requirePostSale && !isPostSale) {
        router.push('/login');
        return;
      }
    }
  }, [user, loading, isAdmin, isVendor, isPostSale, requireAdmin, requireVendor, requirePostSale, router, userRole]);

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

  if (requirePostSale && !isPostSale) {
    return null;
  }

  return <>{children}</>;
}

