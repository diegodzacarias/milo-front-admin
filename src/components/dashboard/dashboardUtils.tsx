import { useEffect, type ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeApiError, type ApiErrorResponse } from "@/lib/apiError";
import { cn } from "@/lib/utils";

export type ReportError = (error: ApiErrorResponse) => void;

// Colores de serie en orden fijo (nunca ciclados por ranking).
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export const FAILURE_COLOR = "hsl(var(--destructive))";
export const NEUTRAL_COLOR = "hsl(var(--muted-foreground))";

// Color fijo por estado de listing, para que la dona y las barras por fuente coincidan.
export const LISTING_STATUS_ORDER = ["ACTIVE", "PREORDER", "WAITLIST", "SOLD_OUT", "ARCHIVED", "UNKNOWN"] as const;

export const LISTING_STATUS_META: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Activo", color: "var(--chart-3)" },
  PREORDER: { label: "Preorden", color: "var(--chart-1)" },
  WAITLIST: { label: "Lista de espera", color: "var(--chart-4)" },
  SOLD_OUT: { label: "Agotado", color: "var(--chart-2)" },
  ARCHIVED: { label: "Archivado", color: "var(--chart-5)" },
  UNKNOWN: { label: "Desconocido", color: NEUTRAL_COLOR },
};

export function listingStatusMeta(status: string) {
  return LISTING_STATUS_META[status] ?? { label: status, color: NEUTRAL_COLOR };
}

// Ordena las claves de un mapa de estados según el orden canónico, dejando los desconocidos al final.
export function orderedStatusEntries(map: Record<string, number> | undefined) {
  const entries = Object.entries(map ?? {});
  const rank = (status: string) => {
    const index = (LISTING_STATUS_ORDER as readonly string[]).indexOf(status);
    return index === -1 ? LISTING_STATUS_ORDER.length : index;
  };
  return entries.sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
}

const numberFormatter = new Intl.NumberFormat("es-PE");

export function formatNumber(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  return numberFormatter.format(value);
}

export function formatPercent(ratio?: number | null, digits = 1) {
  if (ratio === undefined || ratio === null || Number.isNaN(ratio)) return "-";
  return `${(ratio * 100).toFixed(digits)} %`;
}

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(["es"], { type: "region" });
} catch {
  regionNames = null;
}

// "PE" → 🇵🇪 (indicadores regionales Unicode).
export function countryFlag(code: string | null) {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(...[...code.toUpperCase()].map((char) => 127397 + char.charCodeAt(0)));
}

export function countryName(code: string | null) {
  if (!code) return "Desconocido";
  try {
    return regionNames?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

// Envía el error de una query al toast de la página una sola vez por error.
export function useReportQueryError(error: unknown, onError: ReportError, fallbackMessage: string) {
  useEffect(() => {
    if (error) onError(normalizeApiError(error, fallbackMessage));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);
}

type SectionErrorProps = {
  error: unknown;
  fallbackMessage: string;
  onRetry?: () => void;
  className?: string;
};

export function SectionError({ error, fallbackMessage, onRetry, className }: SectionErrorProps) {
  const apiError = normalizeApiError(error, fallbackMessage);

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-destructive">No se pudo cargar esta sección</p>
          <p className="text-muted-foreground">{apiError.message}</p>
        </div>
      </div>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[120px] items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

type KpiCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
  tone?: "default" | "danger";
};

export function KpiCard({ label, value, hint, loading = false, tone = "default" }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-20" />
        ) : (
          <p className={cn("mt-1 text-2xl font-bold tabular-nums", tone === "danger" ? "text-destructive" : "text-foreground")}>
            {value}
          </p>
        )}
        {hint && !loading && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

type ChartCardProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function ChartCard({ title, description, children, action, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-2 space-y-0 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-[260px] w-full", className)} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  );
}

// Barra horizontal apilada simple (HTML) para usar dentro de filas de tabla.
export function StackedBar({
  segments,
  className,
}: {
  segments: { key: string; label: string; value: number; color: string }[];
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total === 0) return <div className={cn("h-2.5 w-full rounded-full bg-muted", className)} />;

  return (
    <div className={cn("flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full", className)}>
      {segments
        .filter((segment) => segment.value > 0)
        .map((segment) => (
          <div
            key={segment.key}
            title={`${segment.label}: ${formatNumber(segment.value)}`}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }}
          />
        ))}
    </div>
  );
}
