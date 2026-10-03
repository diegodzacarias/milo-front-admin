import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useScrapingStats } from "@/hooks/useStats";
import { formatDurationMs } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { DateRange, ScrapingSourceStats } from "@/types/stats";
import {
  ChartCard,
  ChartSkeleton,
  EmptyState,
  FAILURE_COLOR,
  KpiCard,
  SectionError,
  TableSkeleton,
  formatNumber,
  formatPercent,
  useReportQueryError,
  type ReportError,
} from "./dashboardUtils";
import { CycleHeatmap, ScrapingCycleHistory, sourceLabel } from "./ScrapingCycles";

const dailyConfig = {
  ok: { label: "OK", color: "var(--chart-1)" },
  failed: { label: "Fallidas", color: FAILURE_COLOR },
} satisfies ChartConfig;

const HIGH_FAILURE = 0.5;

export function FailureRateBadge({ rate }: { rate: number }) {
  const className =
    rate >= HIGH_FAILURE
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : rate >= 0.1
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  return (
    <Badge variant="outline" className={cn("tabular-nums", className)}>
      {formatPercent(rate)}
    </Badge>
  );
}

type SortKey = "sourceCode" | "runs" | "failureRate" | "avgQueryDurationMs" | "autoMatchRate" | "noResultQueries";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "sourceCode", label: "Fuente" },
  { key: "runs", label: "Corridas", align: "right" },
  { key: "failureRate", label: "% fallo", align: "right" },
  { key: "avgQueryDurationMs", label: "Duración media / query", align: "right" },
  { key: "autoMatchRate", label: "% auto-match", align: "right" },
  { key: "noResultQueries", label: "Queries sin resultado", align: "right" },
];

function compareSources(a: ScrapingSourceStats, b: ScrapingSourceStats, key: SortKey) {
  if (key === "sourceCode") return sourceLabel(a.sourceCode).localeCompare(sourceLabel(b.sourceCode));
  // Los null (sin datos) van siempre al final.
  const left = a[key] ?? Number.NEGATIVE_INFINITY;
  const right = b[key] ?? Number.NEGATIVE_INFINITY;
  return left - right;
}

const formatDayTick = (value: string) => format(parseISO(value), "dd/MM");
const formatDayLabel = (value?: string) => (value ? format(parseISO(value), "EEE d 'de' MMM", { locale: es }) : "");

type ScrapingTabProps = {
  range: DateRange | null;
  onError: ReportError;
};

const ScrapingTab = ({ range, onError }: ScrapingTabProps) => {
  const scraping = useScrapingStats(range);
  useReportQueryError(scraping.error, onError, "Error fetching scraping statistics.");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "failureRate", direction: "desc" });

  const data = scraping.data;
  const loading = scraping.isLoading && range !== null;

  const daily = useMemo(
    () =>
      (data?.daily ?? []).map((day) => ({
        date: day.date,
        ok: Math.max(0, day.runs - day.failed),
        failed: day.failed,
      })),
    [data],
  );

  const sortedSources = useMemo(() => {
    const rows = [...(data?.bySource ?? [])].sort((a, b) => compareSources(a, b, sort.key));
    return sort.direction === "desc" ? rows.reverse() : rows;
  }, [data, sort]);

  const failingSources = (data?.bySource ?? []).filter((source) => source.failureRate > HIGH_FAILURE);
  const globalFailure = data && data.totalRuns > 0 ? data.failedRuns / data.totalRuns : 0;

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "sourceCode" ? "asc" : "desc" },
    );

  return (
    <div className="space-y-6">
      {scraping.isError ? (
        <SectionError error={scraping.error} fallbackMessage="Error fetching scraping statistics." onRetry={() => scraping.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <KpiCard
              label="Corridas"
              value={formatNumber(data?.totalRuns)}
              loading={loading}
              hint={data ? `${formatNumber(data.failedRuns)} fallidas` : undefined}
            />
            <KpiCard
              label="% de fallo global"
              value={formatPercent(globalFailure)}
              loading={loading}
              tone={globalFailure >= HIGH_FAILURE ? "danger" : "default"}
            />
            <KpiCard
              label="Fuentes con fallo > 50 %"
              value={formatNumber(failingSources.length)}
              loading={loading}
              tone={failingSources.length > 0 ? "danger" : "default"}
              hint={
                failingSources.length > 0 ? (
                  <span className="text-destructive">{failingSources.map((source) => sourceLabel(source.sourceCode)).join(", ")}</span>
                ) : (
                  "Todas por debajo del 50 %"
                )
              }
            />
          </div>

          <ChartCard title="Corridas por día" description="Corridas OK vs fallidas (FAILED + BLOCKED).">
            {loading ? (
              <ChartSkeleton />
            ) : daily.length === 0 ? (
              <EmptyState>Sin corridas en este rango.</EmptyState>
            ) : (
              <ChartContainer config={dailyConfig} className="aspect-auto h-[260px] w-full">
                <BarChart data={daily} margin={{ left: -12, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={formatDayTick} minTickGap={16} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent labelFormatter={(_, payload) => formatDayLabel(payload?.[0]?.payload?.date)} />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="ok" stackId="runs" fill="var(--color-ok)" stroke="hsl(var(--card))" strokeWidth={1} />
                  <Bar
                    dataKey="failed"
                    stackId="runs"
                    fill="var(--color-failed)"
                    stroke="hsl(var(--card))"
                    strokeWidth={1}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </ChartCard>

          <ChartCard title="Rendimiento por fuente" description="Haz clic en una columna para ordenar.">
            {loading ? (
              <TableSkeleton />
            ) : sortedSources.length === 0 ? (
              <EmptyState>Sin corridas por fuente en este rango.</EmptyState>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNS.map((column) => {
                      const active = sort.key === column.key;
                      const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
                      return (
                        <TableHead
                          key={column.key}
                          className={cn("whitespace-nowrap", column.align === "right" && "text-right")}
                          aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                        >
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1 hover:text-foreground",
                              active && "text-foreground",
                            )}
                            onClick={() => toggleSort(column.key)}
                          >
                            {column.label}
                            <Icon className="h-3 w-3" />
                          </button>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSources.map((source) => (
                    <TableRow key={source.sourceCode}>
                      <TableCell className="whitespace-nowrap font-medium">{sourceLabel(source.sourceCode)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(source.runs)}</TableCell>
                      <TableCell className="text-right">
                        <FailureRateBadge rate={source.failureRate} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {formatDurationMs(source.avgQueryDurationMs)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatPercent(source.autoMatchRate)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(source.noResultQueries)}
                        <span className="text-xs text-muted-foreground"> / {formatNumber(source.queries)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Errores más frecuentes">
              {loading ? (
                <TableSkeleton />
              ) : (data?.topErrors ?? []).length === 0 ? (
                <EmptyState>Sin errores en este rango.</EmptyState>
              ) : (
                <ul className="divide-y">
                  {data!.topErrors.map((error, index) => (
                    <li key={`${error.sourceCode}-${index}`} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">{sourceLabel(error.sourceCode)}</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="cursor-default truncate font-mono text-xs">{error.errorMessage}</p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md break-words font-mono text-xs">{error.errorMessage}</TooltipContent>
                        </Tooltip>
                      </div>
                      <Badge variant="outline" className="shrink-0 tabular-nums">
                        {formatNumber(error.count)}×
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </ChartCard>

            <ChartCard title="Queries que nunca devuelven resultados">
              {loading ? (
                <TableSkeleton />
              ) : (data?.zeroResultQueries ?? []).length === 0 ? (
                <EmptyState>Todas las queries devolvieron algo en este rango.</EmptyState>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Fuente</TableHead>
                      <TableHead className="text-right">Ejecuciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data!.zeroResultQueries.map((query, index) => (
                      <TableRow key={`${query.sourceCode}-${query.query}-${index}`}>
                        <TableCell className="min-w-[180px] font-mono text-xs">{query.query}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{sourceLabel(query.sourceCode)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(query.executions)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ChartCard>
          </div>
        </>
      )}

      {/* El historial no depende del rango: carga aunque las estadísticas fallen. */}
      <ScrapingCycleHistory onError={onError} />
      <CycleHeatmap />
    </div>
  );
};

export default ScrapingTab;
