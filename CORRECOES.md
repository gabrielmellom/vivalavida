# Correções aplicadas

## Segurança
- APIs admin (`/api/create-user`, `/api/update-user`, `/api/delete-user`) agora exigem ID Token + role `admin` (Firebase Admin SDK).
- Novo endpoint `/api/delete-user` com proteção contra auto-exclusão.
- Senhas em texto claro removidas do Firestore (gravamos só `passwordChangedAt`).
- `/setup` bloqueado quando já existe pelo menos um admin.
- Frontend (`/setup`, `/admin/vendedores`) chama as APIs via `fetchWithAuth` enviando o token.
- Coluna "Senha" removida das telas de vendedores e pós-venda.

## Integridade de dados / concorrência
- `handleApproveReservation` em `runTransaction` (status, valores e pools de assentos atualizados atomicamente).
- `handleRejectReservation` em `writeBatch`: devolve assentos ao pool e zera flags (`receiptSent`, `confirmationSent`, `termsLinkSent`, `voucherSent`).
- Cancelar reserva de líder pergunta se cancela o grupo todo.
- Mover reserva entre barcos / mudar `escunaType` recalcula pools (`seatsTaken`, `seatsWithLandingTaken`, `seatsWithoutLandingTaken`) em transação.
- Edição de `escunaType` em reserva aprovada também recalcula pools em transação.
- Aceite de termos em `/aceite/[id]` propaga para todos os membros do grupo via `writeBatch` (atômico).

## Regras de negócio
- WhatsApp de confirmação propaga `confirmationSent`/`confirmationSentAt` para todos os membros do grupo.
- Mensagens PT-BR e ES reescritas no padrão novo (com contagem dinâmica de pessoas e variação `com/sem desembarque` — `con/sin desembarque`).
- Gratuidade no check-in cria registro de `payment` com `method: 'courtesy'` e `isCourtesy: true` (corrige relatório financeiro).
- Pagamentos no check-in passaram a gravar `vendorId`.
- Pagamentos do vendedor copiam `bankId` e `bankName` da reserva quando existem.

## Datas / timezone
- Novo helper `src/lib/dateUtils.ts` (`todayKey`, `toDateKey`, `formatBrazilianDate`, `formatBrazilianDateLong`, `isSameDay`, `buildDateKey`, `dateKeyToLocalDate`) — sempre em `America/Sao_Paulo`.
- Substituído `new Date().toISOString().split('T')[0]` em:
  - `src/app/admin/page.tsx`
  - `src/app/admin/checkin/page.tsx`
  - `src/app/admin/vouchers/page.tsx`
  - `src/app/vendedor/page.tsx`
  - `src/components/PublicReservationModal.tsx`
- `src/app/admin/relatorios/page.tsx`: `c.date` agora é string `YYYY-MM-DD` e CSV/tabela usam `formatBrazilianDate`/`formatBrDate` (corrige shift de 1 dia em cancelamentos).
- `vendedor/page.tsx` `formatDate` delega ao helper.

## Infra
- `next` atualizado para `16.2.4` e `eslint` para `10.2.1` (resolve erro "Couldn't find a `pages` directory" e conflitos de peer deps).
- Build validado: `npm run build` passa limpo, sem lints.

## Arquivos novos
- `src/lib/dateUtils.ts`
- `src/lib/apiAuth.ts`
- `src/lib/apiClient.ts`
- `src/app/api/delete-user/route.ts`

## Pendências sugeridas (próxima leva)
- Revisar regras do Firestore para acompanhar as novas escritas em batch/transação.
- Log de auditoria para ações destrutivas (cancelar grupo, mover reserva, conceder cortesia).
- Cobertura de testes automatizados (hoje inexistente).
