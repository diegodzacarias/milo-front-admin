import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const pad2 = (value: number) => value.toString().padStart(2, "0");

const formatParts = (
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0
) => `${pad2(day)}/${pad2(month)}/${year} ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;

export function formatDateTime(value?: string | number | Date | null) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "-";
    return formatParts(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds()
    );
  }

  if (typeof value === "number") {
    return formatDateTime(new Date(value));
  }

  const trimmed = value.trim();
  if (!trimmed) return "-";

  const localMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(?:([zZ])|([+-]\d{2}:?\d{2}))?$/
  );

  if (localMatch && !localMatch[7] && !localMatch[8]) {
    return formatParts(
      Number(localMatch[1]),
      Number(localMatch[2]),
      Number(localMatch[3]),
      Number(localMatch[4] || 0),
      Number(localMatch[5] || 0),
      Number(localMatch[6] || 0)
    );
  }

  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.getTime())) {
    return trimmed;
  }

  return formatDateTime(parsedDate);
}

// Duración en ms → "1 h 52 min", "3 min 20 s", "45 s" o "850 ms".
export function formatDurationMs(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  if (value < 1000) return `${Math.round(value)} ms`;

  const totalSeconds = Math.round(value / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}

// El backend envía LocalDateTime sin zona (hora de Perú); parseISO lo interpreta como hora local
// sin desplazarlo, que es lo que se quiere mostrar.
export function parseLocalDateTime(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

// "lun 29/09 15:00"
export function formatShortDayTime(value?: string | null) {
  const parsed = parseLocalDateTime(value);
  return parsed ? format(parsed, "EEE dd/MM HH:mm", { locale: es }) : "-";
}

export function toIsoDate(value: Date) {
  return format(value, "yyyy-MM-dd");
}
