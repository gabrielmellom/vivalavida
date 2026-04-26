/**
 * Utilitários de data/horário com timezone fixo de Florianópolis (America/Sao_Paulo).
 *
 * MOTIVO: O sistema sofria com bugs de "data errada por 1 dia" porque
 * `new Date().toISOString().split('T')[0]` entre 00:00 e 03:00 (horário de SP)
 * retorna o dia anterior em UTC. Aqui centralizamos a conversão sempre na
 * timezone do negócio.
 *
 * REGRAS:
 * - `rideDate` e `boat.date` devem ser armazenados como `YYYY-MM-DD` (só data civil).
 * - Para exibir, usar `formatBrazilianDate` ou `formatBrazilianDateLong`.
 * - Para comparar/filtrar, usar `toDateKey` (sempre devolve `YYYY-MM-DD`).
 */

const BR_TZ = 'America/Sao_Paulo';

/**
 * Retorna a data civil em SP no formato `YYYY-MM-DD`.
 * Aceita Date, string ISO completa, string `YYYY-MM-DD` ou Timestamp do Firestore.
 */
export function toDateKey(input: Date | string | { toDate: () => Date } | null | undefined): string {
  if (!input) return '';

  if (typeof input === 'string') {
    // Já é YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    // ISO com T → pega só a parte de data SE for parseable, senão converte via Date
    if (input.includes('T')) {
      const datePart = input.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        // Para evitar bug de timezone com 'T00:00:00.000Z' representando data civil,
        // assumimos que se a parte de data está ali, é a data civil correta.
        return datePart;
      }
    }
    // Última tentativa via Date
    const d = new Date(input);
    if (isNaN(d.getTime())) return '';
    return formatDateInTz(d, BR_TZ);
  }

  if (input instanceof Date) {
    return formatDateInTz(input, BR_TZ);
  }

  if (typeof input === 'object' && 'toDate' in input && typeof input.toDate === 'function') {
    return formatDateInTz(input.toDate(), BR_TZ);
  }

  return '';
}

/** Retorna `YYYY-MM-DD` para a data civil hoje em São Paulo. */
export function todayKey(): string {
  return formatDateInTz(new Date(), BR_TZ);
}

/** Retorna `YYYY-MM-DD` para ontem em São Paulo. */
export function yesterdayKey(): string {
  const now = new Date();
  // Subtrai 24h e formata na TZ — robusto a horário de verão (que hoje não existe no Brasil, mas defensivo).
  const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return formatDateInTz(y, BR_TZ);
}

/**
 * Formata uma chave/string/Date como dd/mm/yyyy em pt-BR, sem desvio de timezone.
 */
export function formatBrazilianDate(input: Date | string | null | undefined): string {
  const key = toDateKey(input);
  if (!key) return '';
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Formata como "11/04/2026 – Sábado".
 */
export function formatBrazilianDateLong(input: Date | string | null | undefined, locale: 'pt-BR' | 'es' = 'pt-BR'): string {
  const key = toDateKey(input);
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  // Usa meio-dia local pra evitar qualquer flutuação de timezone na obtenção do dia da semana.
  const date = new Date(y, m - 1, d, 12, 0, 0);
  const diasPt = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const diasEs = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dias = locale === 'es' ? diasEs : diasPt;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y} – ${dias[date.getDay()]}`;
}

/**
 * Compara se duas datas (em qualquer formato aceito) representam o mesmo dia civil em SP.
 */
export function isSameDay(a: Date | string | null | undefined, b: Date | string | null | undefined): boolean {
  const ka = toDateKey(a);
  const kb = toDateKey(b);
  return !!ka && ka === kb;
}

/**
 * Constrói uma chave `YYYY-MM-DD` a partir de componentes (ano, mês 1-indexado, dia).
 */
export function buildDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Recebe uma chave `YYYY-MM-DD` e devolve um Date local fixado ao MEIO-DIA
 * (evita problemas de DST / virada de dia em conversões para getDay/getMonth).
 */
export function dateKeyToLocalDate(key: string): Date | null {
  if (!key) return null;
  const datePart = key.includes('T') ? key.split('T')[0] : key;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Implementação interna: formata Date como `YYYY-MM-DD` numa timezone arbitrária.
 * Usa Intl.DateTimeFormat com 'en-CA' (formato ISO) para extração robusta.
 */
function formatDateInTz(date: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date);
}
