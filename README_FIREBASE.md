# Configuração Firebase - Viva la Vida

Este documento descreve como configurar o Firebase para o sistema de reservas.

## 1. Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Firebase Client Configuration (obtenha no Firebase Console > Project Settings > Your apps)
NEXT_PUBLIC_FIREBASE_API_KEY=sua-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=vivalavida-4a5c3.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=vivalavida-4a5c3
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=vivalavida-4a5c3.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=seu-app-id

# Firebase Admin Configuration (extraído do arquivo JSON)
FIREBASE_PRIVATE_KEY_ID=5b8a93d4b8fb7dc808a177f6cb6bf4e2a4cf70a9
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@vivalavida-4a5c3.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=117399026838832575758
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40vivalavida-4a5c3.iam.gserviceaccount.com
```

## 2. Estrutura do Firestore

### Coleção: `boats`
- `id`: string (gerado automaticamente)
- `name`: string (ex: "Barco 2024-12-18")
- `date`: string (ISO date string)
- `seatsTotal`: number
- `seatsTaken`: number
- `status`: 'active' | 'inactive' | 'completed'
- `createdBy`: string (uid do admin)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### Coleção: `reservations`
- `id`: string (gerado automaticamente)
- `boatId`: string (referência ao barco)
- `seatNumber`: number
- `status`: 'pending' | 'approved' | 'cancelled'
- `customerName`: string
- `phone`: string
- `whatsapp`: string (opcional)
- `address`: string
- `paymentMethod`: 'pix' | 'cartao' | 'dinheiro'
- `totalAmount`: number
- `amountPaid`: number
- `amountDue`: number
- `vendorId`: string (uid do vendedor ou 'public' para reservas públicas)
- `rideDate`: string (ISO date string)
- `checkedIn`: boolean (opcional, para check-in no dia)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### Coleção: `roles`
- `uid`: string (uid do usuário no Firebase Auth)
- `email`: string
- `role`: 'admin' | 'vendor'
- `name`: string (opcional)
- `createdAt`: Timestamp

## 3. Configuração Firebase Auth

1. Acesse o Firebase Console
2. Vá em Authentication > Sign-in method
3. Habilite "Email/Password"
4. Crie o primeiro usuário admin manualmente ou use o painel

## 4. Primeiro Usuário Admin

Para criar o primeiro usuário admin:

1. Crie um usuário no Firebase Authentication (Email/Password)
2. No Firestore, crie um documento na coleção `roles` com:
   - Document ID = uid do usuário criado
   - Campos:
     - `uid`: uid do usuário
     - `email`: email do usuário
     - `role`: "admin"
     - `createdAt`: Timestamp atual

## 5. Regras de Segurança Firestore

Configure as regras no Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Roles - apenas usuários autenticados podem ler
    match /roles/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/roles/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Boats - público pode ler, apenas admin pode escrever
    match /boats/{boatId} {
      allow read: if true;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/roles/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Reservations - usuários autenticados podem criar (pending), admin pode aprovar
    match /reservations/{reservationId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (
        resource.data.vendorId == request.auth.uid ||
        get(/databases/$(database)/documents/roles/$(request.auth.uid)).data.role == 'admin'
      );
    }
  }
}
```

## 6. Índices Necessários

Crie os seguintes índices compostos no Firestore:

1. `boats`: `status` (ASC), `date` (ASC)
2. `reservations`: `boatId` (ASC), `status` (ASC)
3. `reservations`: `vendorId` (ASC), `createdAt` (DESC)

## 7. Como Usar

1. **Admin**: Acesse `/admin` para gerenciar barcos, aprovar reservas e criar vendedores
2. **Vendedor**: Acesse `/vendedor` para criar reservas
3. **Público**: Use o botão "Reservar" no site para criar solicitações de reserva

