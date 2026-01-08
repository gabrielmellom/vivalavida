'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserRole } from '@/types';

// Lista de emails que têm permissões de administrador (mesmo sendo vendedores)
// Adicione aqui os emails das pessoas-chave que precisam de acesso total
const SUPER_USERS_EMAILS = [
  'bruna@vivalavida.com.br',
  'bruna.vivalavida@gmail.com',
  // Adicione outros emails conforme necessário
];

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isVendor: boolean;
  isPostSale: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Flag para evitar race conditions
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      
      if (user) {
        setUser(user);
        // Buscar role do usuário
        try {
          const roleDoc = await getDoc(doc(db, 'roles', user.uid));
          if (isMounted) {
            if (roleDoc.exists()) {
              setUserRole(roleDoc.data() as UserRole);
            } else {
              setUserRole(null);
            }
          }
        } catch (error) {
          console.error('Erro ao buscar role:', error);
          if (isMounted) {
            setUserRole(null);
          }
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserRole(null);
  };

  // Verificar se é super user (email na lista de permissões especiais)
  const isSuperUser = user?.email ? SUPER_USERS_EMAILS.some(email => 
    email.toLowerCase() === user.email?.toLowerCase()
  ) : false;
  
  // Super users têm mesmas permissões de admin
  const isAdmin = userRole?.role === 'admin' || isSuperUser;
  const isVendor = userRole?.role === 'vendor' || userRole?.role === 'admin' || isSuperUser;
  const isPostSale = userRole?.role === 'post_sale' || userRole?.role === 'admin' || isSuperUser;

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        loading,
        signIn,
        signOut,
        isAdmin,
        isVendor,
        isPostSale,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

