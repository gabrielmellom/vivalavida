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
    const { uid, name, password } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { error: 'UID é obrigatório' },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const db = getFirestore();

    // Preparar dados para atualizar
    const updateData: Record<string, unknown> = {};
    const firestoreUpdateData: Record<string, unknown> = {};

    // Atualizar nome se fornecido
    if (name) {
      updateData.displayName = name;
      firestoreUpdateData.name = name;
    }

    // Atualizar senha se fornecida
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'A senha deve ter pelo menos 6 caracteres' },
          { status: 400 }
        );
      }
      updateData.password = password;
      firestoreUpdateData.password = password; // Salvar no Firestore para exibição
    }

    // Atualizar usuário no Firebase Auth
    if (Object.keys(updateData).length > 0) {
      await auth.updateUser(uid, updateData as { displayName?: string; password?: string });
    }

    // Atualizar documento de role no Firestore
    if (Object.keys(firestoreUpdateData).length > 0) {
      firestoreUpdateData.updatedAt = new Date();
      await db.collection('roles').doc(uid).update(firestoreUpdateData);
    }

    return NextResponse.json({
      success: true,
      uid,
      message: 'Usuário atualizado com sucesso',
    });
  } catch (error: unknown) {
    console.error('Erro ao atualizar usuário:', error);

    const err = error as { code?: string; message?: string };
    let errorMessage = 'Erro ao atualizar usuário';
    if (err.code === 'auth/user-not-found') {
      errorMessage = 'Usuário não encontrado';
    } else if (err.code === 'auth/invalid-password') {
      errorMessage = 'Senha inválida';
    } else if (err.message) {
      errorMessage = err.message;
    }

    return NextResponse.json(
      { error: errorMessage, code: err.code },
      { status: 400 }
    );
  }
}
