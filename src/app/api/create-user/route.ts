import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdminInitError } from '@/lib/firebase-admin-init';

export async function POST(request: NextRequest) {
  const adminError = getFirebaseAdminInitError();
  if (adminError) {
    return NextResponse.json({ error: adminError }, { status: 500 });
  }

  try {
    const { email, password, name, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, senha e role são obrigatórios' },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const db = getFirestore();

    // Criar usuário usando Admin SDK (não faz login automático)
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name || email,
    });

    const uid = userRecord.uid;

    // Criar documento de role (incluindo senha para exibição)
    await db.collection('roles').doc(uid).set({
      uid,
      email,
      role,
      name: name || email,
      password: password, // Armazenar senha para exibição no admin
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      uid,
      email: userRecord.email,
    });
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);

    let errorMessage = 'Erro ao criar usuário';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'Este email já está em uso';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Email inválido';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage, code: error.code },
      { status: 400 }
    );
  }
}
