# 📊 Como Criar os Índices do Firestore

O Firebase precisa de índices compostos para algumas queries. Siga os passos abaixo:

## ⚡ Solução Rápida (Recomendado)

**Clique nos links que o Firebase forneceu no console do navegador:**

### 1. Índice para Reservas (vendorId + createdAt)

Clique neste link que apareceu no erro:

```
https://console.firebase.google.com/v1/r/project/vivalavida-4a5c3/firestore/indexes?create_composite=ClVwcm9qZWN0cy92aXZhbGF2aWRhLTRhNWMzL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9yZXNlcnZhdGlvbnMvaW5kZXhlcy9fEAEaDAoIdmVuZG9ySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC
```

### 2. Índice para Barcos (status + date)

Clique neste link que apareceu no erro:

```
https://console.firebase.google.com/v1/r/project/vivalavida-4a5c3/firestore/indexes?create_composite=Ck5wcm9qZWN0cy92aXZhbGF2aWRhLTRhNWMzL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9ib2F0cy9pbmRleGVzL18QARoKCgZzdGF0dXMQARoICgRkYXRlEAEaDAoIX19uYW1lX18QAQ
```

**Pronto!** Os índices serão criados automaticamente. Aguarde alguns minutos para eles ficarem ativos.

---

## 📝 Método Manual (se os links não funcionarem)

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **vivalavida-4a5c3**
3. Vá em **Firestore Database** > **Indexes** (ou **Índices**)
4. Clique em **Create Index** (ou **Criar índice**)

### Índice 1: Reservas por Vendedor

- **Collection ID:** `reservations`
- **Fields to index:**
  1. `vendorId` - Ascending
  2. `createdAt` - Descending
- Clique em **Create**

### Índice 2: Barcos por Status e Data

- **Collection ID:** `boats`
- **Fields to index:**
  1. `status` - Ascending
  2. `date` - Ascending
- Clique em **Create**

---

## ⏱️ Tempo de Criação

Os índices podem levar alguns minutos para serem criados. Você verá o status como:
- **Building** (em construção) → aguarde
- **Enabled** (habilitado) → pronto para usar!

Enquanto isso, o sistema continuará funcionando, mas algumas queries podem ser mais lentas.

---

## ✅ Verificar se os Índices Foram Criados

1. No Firebase Console, vá em **Firestore Database** > **Indexes**
2. Você deve ver dois índices compostos:
   - `reservations` com campos `vendorId` e `createdAt`
   - `boats` com campos `status` e `date`

---

## 🔍 Por que são necessários?

O Firestore exige índices compostos quando você usa:
- `where()` + `orderBy()` em campos diferentes
- Múltiplos `where()` em campos diferentes

Isso otimiza as queries e melhora o desempenho.

