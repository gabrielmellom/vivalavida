import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

function getServiceAccount() {
  // Opção 1: JSON completo (mais confiável - copie o JSON inteiro do Firebase Console)
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json);
      // Garantir que a chave privada tenha newlines corretos
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return parsed;
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON inválido:', e);
    }
  }

  // Opção 2: Variáveis individuais
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    // Corrigir newlines: pode vir como literal \n ou já com quebras
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return {
    type: "service_account",
    project_id: "vivalavida-4a5c3",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: "googleapis.com"
  };
}

// Inicializar Admin SDK
let initError: string | null = null;
if (!getApps().length) {
  try {
    const serviceAccount = getServiceAccount();
    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      initError = 'Firebase Admin não configurado. Adicione FIREBASE_SERVICE_ACCOUNT_JSON (recomendado) ou FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL no .env.local';
    } else {
      initializeApp({
        credential: cert(serviceAccount as any),
        projectId: "vivalavida-4a5c3",
      });
    }
  } catch (e: any) {
    initError = e?.message || 'Erro ao configurar Firebase Admin';
    if (initError.includes('PEM') || initError.includes('private key')) {
      initError = 'Chave privada inválida. Use FIREBASE_SERVICE_ACCOUNT_JSON: copie o JSON inteiro do Firebase Console (Configurações do projeto > Contas de serviço > Gerar nova chave) e cole como valor da variável.';
    }
    console.error('[create-user]', initError);
  }
}

export async function POST(request: NextRequest) {
  if (initError) {
    return NextResponse.json(
      { error: initError },
      { status: 500 }
    );
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

