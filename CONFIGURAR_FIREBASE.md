# 🔥 Como Configurar o Firebase - Passo a Passo

## Erro Atual
```
Firebase: Error (auth/invalid-api-key)
```

Isso acontece porque as variáveis de ambiente do Firebase não estão configuradas.

---

## 📋 Passo 1: Obter as Configurações do Firebase

### Opção A: Se você já tem um projeto Firebase

1. Acesse: https://console.firebase.google.com/
2. Selecione seu projeto: **vivalavida-4a5c3**
3. Clique no ícone de ⚙️ **Settings** (Configurações do projeto)
4. Role até **Your apps** e clique no ícone **Web** `</>`
5. Se não tiver um app web, crie um:
   - Clique em **Add app** > **Web**
   - Dê um nome: "Viva la Vida Web"
   - Clique em **Register app**
6. Você verá uma configuração assim:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "vivalavida-4a5c3.firebaseapp.com",
  projectId: "vivalavida-4a5c3",
  storageBucket: "vivalavida-4a5c3.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

**ANOTE ESSES VALORES!**

### Opção B: Criar um novo projeto Firebase (se não tiver)

1. Acesse: https://console.firebase.google.com/
2. Clique em **Add project** ou **Criar projeto**
3. Nome do projeto: **vivalavida-4a5c3** (ou outro)
4. Siga os passos
5. Quando terminar, vá em **Settings** > **Your apps** > **Web**
6. Copie as configurações

---

## 📝 Passo 2: Criar o Arquivo .env.local

Na raiz do projeto (mesmo nível do `package.json`), crie um arquivo chamado `.env.local`

### No Windows (PowerShell):

```powershell
New-Item -Path ".env.local" -ItemType File
```

### Ou manualmente:
1. Abra o VS Code (ou editor de texto)
2. Crie um novo arquivo
3. Salve como `.env.local` na raiz do projeto

---

## ✏️ Passo 3: Adicionar as Variáveis de Ambiente

Abra o arquivo `.env.local` e adicione:

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=COLE_AQUI_A_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=vivalavida-4a5c3.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=vivalavida-4a5c3
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=vivalavida-4a5c3.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=COLE_AQUI_O_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=COLE_AQUI_O_APP_ID

# Firebase Admin Configuration (do arquivo JSON que você já tem)
FIREBASE_PRIVATE_KEY_ID=5b8a93d4b8fb7dc808a177f6cb6bf4e2a4cf70a9
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCivdee0y7ZISiV\nqVFEHJYkWpVEKd8PfbDuWSqqti7/YDKtJ7oLlWZ6pfNvb/AQhlaXXZgz8p0Jxjjd\nvubp/AZX/WxfP5W11ic3Js498Wg3gICoezXhH2VYwWLxq3AVjr+XOYuNB/JymUzL\nP+V4TtgnA1Ojq7O/6gA+TgSm1g2BuiksQF+f34QT0VcQxLHHCBGQYIQ1hyOOsDcR\nznUYWyDc8U23f40JVK5iPbPnWK/tNROAI1ATcThd5vo3XbZYBLS+u2D3GkC4n5Ss\nJxpjFEfR0cZ1i+NpeIm0m6xRVFHWfTjPIkEfE2gCSSKGUWrps1osyo+f1vhldIuM\n+Z3nO8YNAgMBAAECggEAA+aGbDdWDFyz1xBxku8XdyQXp0RUpQ+nZbML538J1dOV\nq1pEJoJsbBydnsphR9gca7DR1M7oDiOq2b+5U5rXgRThG9BPk4XgNz1uHIR0cb4Z\n90/KrQxeVrf92dp4y396HpMBwf3ShQYhFc8AfjdvjVHSV54mJv+iBVxD1sbTGIyW\no/N5R9aOommG+GRsC50FJMtHtl/JGjxWm6li1+8IlkVb+nCkZODuHL7wWmE3kzrU\npwlqd7adf96itk8HyHUzs+Pr2WPbAEhYmWLYT+R3O1XXn5rVoGXKn1kIakhHYDwJ\nAsjknj/lwXbnorqV8rTrL+wUfBL6YU1vj6Zu9L40cQKBgQDWCjpj4Su9zwxcv6dV\nX23jMIuJRpNfwmF8feZzAkf5M8DnvvMXQWoW4BJzmO2jXPrwgUFwHTDeGXFNdnKY\nhU6EoxJKE8F/V0ueymwvyBp0UJJPOnjTdeCRZrTCwmXGtzmLcSD9WobTqwO4BoG7\n1S2OVnaK958wV6K4dhU5G1L8MQKBgQDCpSmY7bUfoIqRnZxAKajOseePDn0zee5a\nGAr3ZlJOXBFZ0iW6g52qwIp/H6wgQHbIxHFrFab0SRUjC4YDdoyaHHSHvcmOD1Vd\ndUbC4ZULPEunucxAMkXIxek7kS6RjsG+GhlR7Hn/ueNohY+aqPpYBobNLZ9nMs4j\nllfOgC3cnQKBgBD8dM/SYddJZDDEIPJ8hUr/YkN9r1ptIbFwiGZeKvoS6l853y7c\nSSARnkVAQLOzQFLv3xKXrnYhzMUZ/lQuWCHckyn/0V5aviyW4ekU10ydzE6vVEFr\n3GuNnBDMvqj7h3ySeMzCb2rC6qOjGI6gh2IBaJz0s9RxT/+Vl2+VxIsxAoGASRR1\n38MwA+Xk4PNKHRUHGkPVavLHszIOeakZRPYX5O/QW+b432RXKCsOVNhxadKKRqrq\n4ofInWNrGjNTZ6108M/KOMTbDglXxbUokjbcHNHQnfK2a0v0w4L7JLBHycLNnzBx\nXT7qN0d1yGKNHkZfZ/lbV2HPvZFnsBjcct3RWkkCgYAZpwLA8wI3dnKxvZeKsC4y\nMNd4WEEgs87LPN2tbJcZQRZvanJK24+8yxrBS0Vr/DI3Ij07KevwLzSMW5WsTFx/\niMv9du8W4O2FaDK05ZOryv4eiT7bAF+fYqf6eXoaBY8wPWi5xWRJqh3Xz9HB9v/d\nSJWtIrfAccAT3Fkeb9qS8w==\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@vivalavida-4a5c3.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=117399026838832575758
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40vivalavida-4a5c3.iam.gserviceaccount.com
```

**Substitua:**
- `COLE_AQUI_A_API_KEY` → pela `apiKey` que você copiou
- `COLE_AQUI_O_MESSAGING_SENDER_ID` → pelo `messagingSenderId`
- `COLE_AQUI_O_APP_ID` → pelo `appId`

---

## ⚠️ Importante sobre FIREBASE_PRIVATE_KEY

Se você usar a chave privada completa, precisa manter as quebras de linha `\n`. 
O valor já está no exemplo acima, mas se precisar copiar do arquivo JSON, certifique-se de manter o formato com `\n`.

---

## 🔄 Passo 4: Reiniciar o Servidor

Após criar o arquivo `.env.local`:

1. **Pare o servidor** (Ctrl + C no terminal)
2. **Inicie novamente:**

```bash
npm run dev
```

---

## ✅ Passo 5: Verificar se Funcionou

1. Acesse: `http://localhost:3001` (ou 3000 se disponível)
2. O erro não deve mais aparecer
3. Você pode acessar `/setup` para criar o primeiro admin

---

## 🐛 Problemas Comuns

### "Ainda está dando erro de API key"
- Certifique-se de que o arquivo se chama `.env.local` (com o ponto no início)
- Certifique-se de que está na raiz do projeto (mesmo nível do package.json)
- Reinicie o servidor completamente

### "Não encontro as configurações no Firebase Console"
- Certifique-se de estar no projeto correto
- Se não tiver um app web, crie um primeiro
- As configurações aparecem após criar o app web

### "Como copiar a chave privada do JSON?"
- Abra o arquivo `vivalavida-4a5c3-firebase-adminsdk-*.json`
- Copie o valor do campo `private_key`
- Mantenha as `\n` no meio da string

---

## 📞 Precisa de Ajuda?

Se ainda tiver problemas, verifique:
1. O arquivo `.env.local` existe na raiz?
2. As variáveis começam com `NEXT_PUBLIC_` para as do cliente?
3. O servidor foi reiniciado após criar o arquivo?
4. Não há espaços extras ou aspas incorretas nas variáveis?

