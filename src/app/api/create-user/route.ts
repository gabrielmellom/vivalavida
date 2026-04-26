import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireAdmin, hasAnyAdmin } from '@/lib/apiAuth';

const ALLOWED_ROLES = new Set(['admin', 'vendor', 'post_sale']);

export async function POST(request: NextRequest) {
  // Bootstrap: a primeira instalação (sem nenhum admin) pode criar o primeiro admin
  // sem autenticação — depois disso, exige auth.
  let bootstrapMode = false;
  try {
    const anyAdmin = await hasAnyAdmin();
    if (!anyAdmin) bootstrapMode = true;
  } catch (e) {
    // Se falhar a leitura, assumimos que precisa autenticar (mais seguro).
    console.error('[create-user] hasAnyAdmin falhou:', e);
  }

  if (!bootstrapMode) {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
  }

  try {
    const { email, password, name, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, senha e role são obrigatórios' },
        { status: 400 }
      );
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        { error: 'Role inválida.' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Senha precisa ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const db = getFirestore();

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name || email,
    });

    const uid = userRecord.uid;

    // NÃO armazenamos a senha em claro. Para reset, use endpoint específico
    // ou o link de "esqueci a senha" do Firebase Auth.
    await db.collection('roles').doc(uid).set({
      uid,
      email,
      role,
      name: name || email,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      uid,
      email: userRecord.email,
    });
  } catch (error: unknown) {
    console.error('Erro ao criar usuário:', error);
    const err = error as { code?: string; message?: string };

    let errorMessage = 'Erro ao criar usuário';
    if (err.code === 'auth/email-already-exists') {
      errorMessage = 'Este email já está em uso';
    } else if (err.code === 'auth/invalid-email') {
      errorMessage = 'Email inválido';
    } else if (err.code === 'auth/weak-password') {
      errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres';
    } else if (err.message) {
      errorMessage = err.message;
    }

    return NextResponse.json(
      { error: errorMessage, code: err.code },
      { status: 400 }
    );
  }
}
