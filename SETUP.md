# Como Criar o Primeiro Usuário Admin

Existem duas formas de criar o primeiro usuário administrador:

## Método 1: Página de Setup (Recomendado) ⭐

A forma mais fácil é usar a página de setup automática:

1. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Acesse no navegador:**
   ```
   http://localhost:3000/setup
   ```

3. **Preencha o formulário:**
   - Nome completo
   - Email (será usado para login)
   - Senha (mínimo 6 caracteres)
   - Confirmar senha

4. **Clique em "Criar Administrador"**

5. **Aguarde o sucesso** - você será redirecionado para o login automaticamente

**Nota:** Esta página só funciona se ainda não existir nenhum admin. Se já houver um admin cadastrado, a página mostrará uma mensagem informando isso.

---

## Método 2: Manual via Firebase Console

Se preferir fazer manualmente:

### Passo 1: Criar Usuário no Firebase Authentication

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **vivalavida-4a5c3**
3. Vá em **Authentication** > **Users**
4. Clique em **Add user**
5. Preencha:
   - **Email:** seu email
   - **Password:** sua senha (mínimo 6 caracteres)
6. Clique em **Add user**
7. **Copie o UID** do usuário criado (será necessário no próximo passo)

### Passo 2: Adicionar Role no Firestore

1. No Firebase Console, vá em **Firestore Database**
2. Clique em **Start collection** (se for a primeira vez) ou vá para a coleção `roles`
3. Clique em **Add document**
4. No campo **Document ID**, cole o **UID** que você copiou no passo anterior
5. Adicione os seguintes campos:

   | Campo        | Tipo    | Valor                                    |
   |--------------|---------|------------------------------------------|
   | `uid`        | string  | (o mesmo UID do documento)               |
   | `email`      | string  | (o email do usuário)                     |
   | `role`       | string  | `admin`                                  |
   | `name`       | string  | (seu nome completo - opcional)           |
   | `createdAt`  | timestamp | (clique no ícone de relógio e selecione "now") |

6. Clique em **Save**

### Pronto! ✅

Agora você pode fazer login em:
```
http://localhost:3000/login
```

Use o email e senha que você criou.

---

## Verificando se Funcionou

Após criar o admin, você pode verificar:

1. Faça login em `/login`
2. Deve redirecionar automaticamente para `/admin`
3. Você verá o painel administrativo com todas as funcionalidades

---

## Problemas Comuns

### "Este email já está em uso"
- O usuário já existe no Firebase Authentication
- Você pode usar outro email ou fazer login normalmente
- Se precisar adicionar a role manualmente, siga o Método 2, Passo 2

### "Erro ao criar usuário admin"
- Verifique se o Firebase está configurado corretamente
- Verifique se as variáveis de ambiente estão definidas
- Verifique o console do navegador para mais detalhes do erro

### "Admin já configurado" na página de setup
- Isso significa que já existe um admin no sistema
- Use o Método 2 se precisar criar outro admin manualmente

---

## Criar Vendedores

Após ter o admin configurado, você pode criar vendedores através do painel:

1. Faça login como admin
2. Vá em **Gerenciar Vendedores** (`/admin/vendedores`)
3. Clique em **Adicionar Vendedor**
4. Preencha os dados e crie

