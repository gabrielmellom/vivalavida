import { initializeApp, getApps, cert } from 'firebase-admin/app';

const PROJECT_ID = 'vivalavida-4a5c3';

function getServiceAccount(): Record<string, unknown> {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json) as Record<string, unknown>;
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = (parsed.private_key as string).replace(/\\n/g, '\n');
      }
      return parsed;
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON inválido:', e);
    }
  }

  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return {
    type: 'service_account',
    project_id: PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: 'googleapis.com',
  };
}

let initAttempted = false;
let initError: string | null = null;

/**
 * Inicializa o Firebase Admin uma vez. Sem credenciais válidas, não chama cert() (evita erro no build).
 */
function ensureFirebaseAdminInitialized(): void {
  if (initAttempted) return;
  initAttempted = true;

  if (getApps().length) {
    return;
  }

  try {
    const serviceAccount = getServiceAccount();
    const pk = serviceAccount.private_key;
    const clientEmail = serviceAccount.client_email;
    if (typeof pk !== 'string' || !pk.trim() || typeof clientEmail !== 'string' || !clientEmail.trim()) {
      initError =
        'Firebase Admin não configurado. Adicione FIREBASE_SERVICE_ACCOUNT_JSON (recomendado) ou FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL no .env.local';
      return;
    }

    initializeApp({
      credential: cert(serviceAccount as any),
      projectId: PROJECT_ID,
    });
  } catch (e: unknown) {
    let msg = e instanceof Error ? e.message : 'Erro ao configurar Firebase Admin';
    if (msg.includes('PEM') || msg.includes('private key')) {
      msg =
        'Chave privada inválida. Use FIREBASE_SERVICE_ACCOUNT_JSON: copie o JSON inteiro do Firebase Console (Contas de serviço > Gerar nova chave).';
    }
    initError = msg;
    console.error('[firebase-admin-init]', msg);
  }
}

ensureFirebaseAdminInitialized();

export function getFirebaseAdminInitError(): string | null {
  ensureFirebaseAdminInitialized();
  return initError;
}
