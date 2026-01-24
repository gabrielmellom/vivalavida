import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Inicializar Admin SDK
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: "vivalavida-4a5c3",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: "googleapis.com"
  };

  initializeApp({
    credential: cert(serviceAccount as any),
    projectId: "vivalavida-4a5c3",
  });
}

export async function POST(request: NextRequest) {
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
    const updateData: any = {};
    const firestoreUpdateData: any = {};

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
      await auth.updateUser(uid, updateData);
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
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    
    let errorMessage = 'Erro ao atualizar usuário';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'Usuário não encontrado';
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = 'Senha inválida';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage, code: error.code },
      { status: 400 }
    );
  }
}
