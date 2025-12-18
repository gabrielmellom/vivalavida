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

    // Criar documento de role
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

