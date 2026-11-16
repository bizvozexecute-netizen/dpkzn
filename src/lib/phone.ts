/**
 * Нормализация телефона к виду +7XXXXXXXXXX.
 * Используется приёмом заявок (/api/submit) и админ-API CRM — один формат
 * в базе, чтобы поиск по номеру и дедупликация не спотыкались о скобки.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return `+7${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("9")) {
    return `+7${digits}`;
  }
  // Иностранные и нестандартные — как есть, с плюсом
  return raw.startsWith("+") ? `+${digits}` : digits ? `+${digits}` : "";
}
