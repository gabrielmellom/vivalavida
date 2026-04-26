import { getAuth } from 'firebase/auth';

/**
 * Wrapper de fetch que envia o ID token do usuário logado no header Authorization.
 * Use para chamar /api/* protegidas (admin only).
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Você precisa estar logado para executar esta ação.');
  }
  const idToken = await user.getIdToken();
  const headers = new Headers(init?.headers || {});
  headers.set('Authorization', `Bearer ${idToken}`);
  if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, { ...init, headers });
}
