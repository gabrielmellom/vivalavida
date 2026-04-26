import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdminInitError } from './firebase-admin-init';

/**
 * Lista de e-mails que sempre são considerados admin (espelho do AuthContext).
 * Útil para o setup inicial e contas de suporte.
 */
const SUPER_USER_EMAILS = (process.env.SUPER_USER_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export interface AuthenticatedAdmin {
  uid: string;
  email: string;
  role: 'admin' | 'vendor' | 'post_sale' | 'super';
}

/**
 * Garante que a requisição:
 *  1. Tem Firebase Admin inicializado
 *  2. Inclui um Authorization: Bearer <idToken> válido
 *  3. O usuário do token tem role 'admin' (em /roles/{uid}) OU está em SUPER_USER_EMAILS
 *
 * Retorna NextResponse de erro ou o objeto AuthenticatedAdmin se OK.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | AuthenticatedAdmin> {
  const initError = getFirebaseAdminInitError();
  if (initError) {
    return NextResponse.json({ error: initError }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json(
      { error: 'Autorização ausente. Faça login como admin.' },
      { status: 401 }
    );
  }

  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    return NextResponse.json({ error: 'Token vazio.' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(idToken, true);
  } catch (e) {
    console.error('[apiAuth] verifyIdToken falhou:', e);
    return NextResponse.json(
      { error: 'Token inválido ou expirado.' },
      { status: 401 }
    );
  }

  const email = (decoded.email || '').toLowerCase();
  const uid = decoded.uid;

  if (email && SUPER_USER_EMAILS.includes(email)) {
    return { uid, email, role: 'super' };
  }

  // Verifica role no Firestore
  try {
    const db = getFirestore();
    const snap = await db.collection('roles').doc(uid).get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: 'Usuário sem permissão.' },
        { status: 403 }
      );
    }
    const data = snap.data() || {};
    const role = data.role as 'admin' | 'vendor' | 'post_sale' | undefined;
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem executar esta ação.' },
        { status: 403 }
      );
    }
    return { uid, email, role };
  } catch (e) {
    console.error('[apiAuth] erro ao ler role:', e);
    return NextResponse.json(
      { error: 'Erro ao validar permissão.' },
      { status: 500 }
    );
  }
}

/**
 * Verifica se já existe pelo menos um admin no Firestore.
 * Usado para liberar /api/setup-bootstrap só na primeira instalação.
 */
export async function hasAnyAdmin(): Promise<boolean> {
  const db = getFirestore();
  const snap = await db.collection('roles').where('role', '==', 'admin').limit(1).get();
  return !snap.empty;
}
