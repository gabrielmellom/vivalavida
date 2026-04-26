import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireAdmin } from '@/lib/apiAuth';

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { uid } = await request.json();
    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ error: 'UID é obrigatório' }, { status: 400 });
    }

    if (uid === authResult.uid) {
      return NextResponse.json(
        { error: 'Você não pode excluir sua própria conta.' },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const db = getFirestore();

    // Apaga primeiro o documento do Firestore para evitar conta sem role.
    try {
      await db.collection('roles').doc(uid).delete();
    } catch (e) {
      console.error('[delete-user] erro ao apagar role:', e);
    }

    // Depois remove do Firebase Auth (pode não existir, ignorar)
    try {
      await auth.deleteUser(uid);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code !== 'auth/user-not-found') {
        throw e;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Erro ao excluir usuário:', error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'Erro ao excluir usuário' },
      { status: 400 }
    );
  }
}
