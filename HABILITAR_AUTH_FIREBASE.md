# 🔐 Como Habilitar Autenticação Email/Senha no Firebase

O erro 400 ao criar vendedor geralmente acontece porque a autenticação por Email/Senha não está habilitada no Firebase.

## 📋 Passo a Passo

1. **Acesse o Firebase Console:**
   - https://console.firebase.google.com/
   - Selecione seu projeto: **vivalavida-4a5c3**

2. **Vá em Authentication (Autenticação):**
   - No menu lateral esquerdo, clique em **Authentication** ou **Autenticação**

3. **Habilite Email/Password:**
   - Clique na aba **Sign-in method** (ou **Métodos de login**)
   - Procure por **Email/Password** na lista
   - Clique nele
   - **Ative** o toggle "Enable" (ou **Habilitar**)
   - Clique em **Save** (Salvar)

4. **Pronto!** Agora você pode criar usuários pelo sistema.

---

## ⚠️ Se ainda não funcionar

### Verificar Domínios Autorizados

1. Ainda na página de Authentication
2. Vá na aba **Settings** (Configurações)
3. Role até **Authorized domains** (Domínios autorizados)
4. Certifique-se de que `localhost` está na lista
5. Se não estiver, clique em **Add domain** e adicione `localhost`

---

## 🧪 Teste

Após habilitar, tente criar um vendedor novamente pelo painel admin.

---

## 📞 Erro ainda persiste?

Verifique se:
- ✅ Email/Senha está habilitado
- ✅ localhost está nos domínios autorizados
- ✅ A API Key está correta no `.env.local`
- ✅ O projeto Firebase está correto

