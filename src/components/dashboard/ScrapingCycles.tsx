import { useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PageControls from "@/components/ui/page-controls";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useScrapingCycleDetail, useScrapingCycles } from "@/hooks/useStats";
import { formatDateTime, formatDurationMs, formatShortDayTime, parseLocalDateTime } from "@/lib/date";
import { getPageContent, getPageMeta } from "@/lib/page";
import { SCRAPING_SOURCE_OPTIONS } from "@/lib/scrapingSources";
import { cn } from "@/lib/utils";
import type { ScrapingCycle, ScrapingCycleStatus, ScrapingCycleType } from "@/types/stats";
import {
  ChartCard,
  EmptyState,
  SectionError,
  TableSkeleton,
  formatNumber,
  orderedStatusEntries,
  useReportQueryError,
  type ReportError,
} from "./dashboardUtils";

const sourceLabels: Record<string, string> = Object.fromEntries(
  SCRAPING_SOURCE_OPTIONS.map((option) => [option.value, option.label]),
);

export const sourceLabel = (code: string) => sourceLabels[code] ?? code;

const TYPE_LABELS: Record<ScrapingCycleType, string> = { DISCOVERY: "Discovery", LISTING: "Listing" };

const STATUS_META: Record<ScrapingCycleStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  RUNNING: {
    label: "En curso",
    className: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
    icon: Loader2,
  },
  COMPLETED: {
    label: "Completada",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  COMPLETED_WITH_ERRORS: {
    label: "Con errores",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: AlertCircle,
  },
  INTERRUPTED: {
    label: "Interrumpida",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
};

export function CycleStatusBadge({ status }: { status: ScrapingCycleStatus }) {
  const meta = STATUS_META[status] ?? { label: status, className: "", icon: AlertCircle };
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 whitespace-nowrap", meta.className)}>
      <Icon className={cn("h-3 w-3", status === "RUNNING" && "animate-spin")} />
      {meta.label}
    </Badge>
  );
}

const triggerLabel = (trigger: ScrapingCycle["trigger"]) =>
  trigger === "SCHEDULED" ? "Programada" : trigger === "MANUAL" ? "Manual" : "—";

// Los totales significan cosas distintas según el tipo de ciclo.
function cycleTotals(cycle: ScrapingCycle) {
  if (cycle.type === "DISCOVERY") {
    return [
      { label: "descubiertas", value: cycle.totalCount },
      { label: "creadas", value: cycle.createdCount },
      { label: "cambios de estado", value: cycle.updatedCount },
      { label: "posibles duplicados", value: cycle.pendingReviewCount },
    ];
  }
  return [
    { label: "corridas", value: cycle.totalCount },
    { label: "listings nuevos", value: cycle.createdCount },
    { label: "actualizados", value: cycle.updatedCount },
    { label: "candidatos", value: cycle.pendingReviewCount },
    { label: "fallidas", value: cycle.failedCount, danger: cycle.failedCount > 0 },
  ];
}

function CycleTotals({ cycle }: { cycle: ScrapingCycle }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      {cycleTotals(cycle).map((item) => (
        <span key={item.label} className="whitespace-nowrap text-muted-foreground">
          <span className={cn("font-semibold tabular-nums text-foreground", "danger" in item && item.danger && "text-destructive")}>
            {formatNumber(item.value)}
          </span>{" "}
          {item.label}
        </span>
      ))}
    </div>
  );
}

type TypeFilter = "ALL" | ScrapingCycleType;

export const ScrapingCycleHistory = ({ onError }: { onError: ReportError }) => {
  const [type, setType] = useState<TypeFilter>("ALL");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const cycles = useScrapingCycles({ type: type === "ALL" ? null : type, page, size });
  useReportQueryError(cycles.error, onError, "Error fetching scraping cycles.");

  const rows = getPageContent(cycles.data);
  const pageMeta = getPageMeta(cycles.data, size);

  return (
    <ChartCard
      title="Historial de corridas"
      description="Cada ciclo de Discovery o Listing. Haz clic en una fila para ver el detalle."
      action={
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={type}
          onValueChange={(value) => {
            if (!value) return;
            setType(value as TypeFilter);
            setPage(0);
          }}
          aria-label="Tipo de corrida"
        >
          <ToggleGroupItem value="ALL">Todos</ToggleGroupItem>
          <ToggleGroupItem value="DISCOVERY">Discovery</ToggleGroupItem>
          <ToggleGroupItem value="LISTING">Listing</ToggleGroupItem>
        </ToggleGroup>
      }
    >
      {cycles.isError ? (
        <SectionError error={cycles.error} fallbackMessage="Error fetching scraping cycles." onRetry={() => cycles.refetch()} />
      ) : cycles.isLoading ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState>
          Todavía no hay corridas registradas. El historial empieza a llenarse con el próximo ciclo de scraping.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <div className={cn("transition-opacity", cycles.isPlaceholderData && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="min-w-[260px]">Totales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((cycle) => (
                  <TableRow key={cycle.id} className="cursor-pointer" onClick={() => setSelectedId(cycle.id)}>
                    <TableCell className="whitespace-nowrap font-medium capitalize">{formatShortDayTime(cycle.startedAt)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{TYPE_LABELS[cycle.type] ?? cycle.type}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{triggerLabel(cycle.trigger)}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDurationMs(cycle.durationMs)}</TableCell>
                    <TableCell>
                      <CycleStatusBadge status={cycle.status} />
                    </TableCell>
                    <TableCell>
                      <CycleTotals cycle={cycle} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PageControls
            page={page}
            size={pageMeta.size}
            totalElements={pageMeta.totalElements}
            totalPages={pageMeta.totalPages}
            disabled={cycles.isFetching}
            onPageChange={setPage}
            onSizeChange={(nextSize) => {
              setSize(nextSize);
              setPage(0);
            }}
          />
        </div>
      )}

      <CycleDetailSheet cycleId={selectedId} onClose={() => setSelectedId(null)} />
    </ChartCard>
  );
};

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

const CycleDetailSheet = ({ cycleId, onClose }: { cycleId: number | null; onClose: () => void }) => {
  const detail = useScrapingCycleDetail(cycleId);
  const cycle = detail.data?.cycle;
  const summary = detail.data?.summary;

  const listingStatuses = useMemo(() => {
    const merged: Record<string, number> = {};
    summary?.listingSources.forEach((source) =>
      Object.entries(source.countsByStatus ?? {}).forEach(([status, count]) => {
        merged[status] = (merged[status] ?? 0) + count;
      }),
    );
    return orderedStatusEntries(merged).map(([status]) => status);
  }, [summary]);

  return (
    <Sheet open={cycleId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {cycle ? `${TYPE_LABELS[cycle.type] ?? cycle.type} #${cycle.id}` : "Detalle de corrida"}
          </SheetTitle>
          <SheetDescription>
            {cycle ? `${formatDateTime(cycle.startedAt)} · ${triggerLabel(cycle.trigger)}` : "Cargando…"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {detail.isError ? (
            <SectionError error={detail.error} fallbackMessage="Error fetching scraping cycle detail." onRetry={() => detail.refetch()} />
          ) : detail.isLoading || !cycle ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <div className="mt-1">
                    <CycleStatusBadge status={cycle.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duración</p>
                  <p className="mt-1 font-medium tabular-nums">{formatDurationMs(cycle.durationMs)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fin</p>
                  <p className="mt-1 font-medium">{cycle.finishedAt ? formatShortDayTime(cycle.finishedAt) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fuentes</p>
                  <p className="mt-1 font-medium tabular-nums">{formatNumber(cycle.sourceCount)}</p>
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <CycleTotals cycle={cycle} />
                </div>
                {cycle.closedEarly && (
                  <p className="col-span-2 text-xs text-amber-700 dark:text-amber-400 sm:col-span-4">
                    El ciclo se cerró antes de terminar todas las fuentes.
                  </p>
                )}
                {cycle.failureMessage && (
                  <p className="col-span-2 break-words text-xs text-destructive sm:col-span-4">{cycle.failureMessage}</p>
                )}
              </div>

              {!summary ? (
                <EmptyState>Esta corrida no tiene resumen detallado.</EmptyState>
              ) : (
                <>
                  <DetailSection title="Fuentes planificadas">
                    {summary.plannedSources.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Ninguna.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {summary.plannedSources.map((source) => (
                          <Badge key={source} variant="secondary">
                            {sourceLabel(source)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </DetailSection>

                  {summary.discoverySources.length > 0 && (
                    <DetailSection title="Resultado por fuente">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fuente</TableHead>
                            <TableHead>Franquicia</TableHead>
                            <TableHead className="text-right">Descubiertas</TableHead>
                            <TableHead className="text-right">Creadas</TableHead>
                            <TableHead className="text-right">Estado act.</TableHead>
                            <TableHead className="text-right">Sin cambios</TableHead>
                            <TableHead className="text-right">Bajo precio</TableHead>
                            <TableHead className="text-right">Duplicados</TableHead>
                            <TableHead className="text-right">Fallidas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.discoverySources.map((source, index) => (
                            <TableRow key={`${source.sourceCode}-${source.franchiseName}-${index}`}>
                              <TableCell className="whitespace-nowrap font-medium">{sourceLabel(source.sourceCode)}</TableCell>
                              <TableCell className="whitespace-nowrap">{source.franchiseName}</TableCell>
                              <TableCell className="text-right tabular-nums">{source.discovered}</TableCell>
                              <TableCell className="text-right tabular-nums">{source.created}</TableCell>
                              <TableCell className="text-right tabular-nums">{source.statusUpdated}</TableCell>
                              <TableCell className="text-right tabular-nums">{source.unchanged}</TableCell>
                              <TableCell className="text-right tabular-nums">{source.skippedBelowPriceThreshold}</TableCell>
                              <TableCell className="text-right tabular-nums">{source.pendingDuplicateReview}</TableCell>
                              <TableCell className={cn("text-right tabular-nums", source.failed > 0 && "text-destructive")}>
                                {source.failed}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </DetailSection>
                  )}

                  {summary.listingSources.length > 0 && (
                    <DetailSection title="Corridas por fuente y estado">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fuente</TableHead>
                            {listingStatuses.map((status) => (
                              <TableHead key={status} className="whitespace-nowrap text-right">
                                {status}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.listingSources.map((source) => (
                            <TableRow key={source.sourceCode}>
                              <TableCell className="whitespace-nowrap font-medium">{sourceLabel(source.sourceCode)}</TableCell>
                              {listingStatuses.map((status) => (
                                <TableCell key={status} className="text-right tabular-nums">
                                  {source.countsByStatus?.[status] ?? 0}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </DetailSection>
                  )}

                  <DetailSection title={`Figuras nuevas (${summary.newFigures.length})`}>
                    {summary.newFigures.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No se crearon figuras.</p>
                    ) : (
                      <ul className="max-h-64 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
                        {summary.newFigures.map((name, index) => (
                          <li key={`${name}-${index}`}>{name}</li>
                        ))}
                      </ul>
                    )}
                  </DetailSection>

                  <DetailSection title={`Errores (${summary.errors.length})`}>
                    {summary.errors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin errores.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {summary.errors.map((error, index) => (
                          <li
                            key={`${index}-${error.slice(0, 20)}`}
                            className="break-words rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 font-mono text-xs"
                          >
                            {error}
                          </li>
                        ))}
                      </ul>
                    )}
                  </DetailSection>
                </>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HEATMAP_SAMPLE = 200;

// Heatmap día de la semana × hora con la duración media de las corridas que empezaron en esa franja.
export const CycleHeatmap = () => {
  const cycles = useScrapingCycles({ type: null, page: 0, size: HEATMAP_SAMPLE });
  const rows = getPageContent(cycles.data);

  const { cells, max } = useMemo(() => {
    const grid = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ count: 0, totalMs: 0 })),
    );
    rows.forEach((cycle) => {
      const started = parseLocalDateTime(cycle.startedAt);
      if (!started || cycle.durationMs === null) return;
      const day = (started.getDay() + 6) % 7; // lunes = 0
      const cell = grid[day][started.getHours()];
      cell.count += 1;
      cell.totalMs += cycle.durationMs;
    });
    const averages = grid.map((hours) => hours.map((cell) => ({ count: cell.count, avgMs: cell.count ? cell.totalMs / cell.count : 0 })));
    const maxAvg = Math.max(0, ...averages.flat().map((cell) => cell.avgMs));
    return { cells: averages, max: maxAvg };
  }, [rows]);

  if (cycles.isError) return null;

  return (
    <ChartCard
      title="Duración por día y hora"
      description={`Duración media de las últimas ${HEATMAP_SAMPLE} corridas según su hora de inicio (hora de Perú).`}
    >
      {cycles.isLoading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : max === 0 ? (
        <EmptyState>Sin corridas terminadas para graficar.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-grid min-w-[640px] grid-cols-[40px_repeat(24,minmax(20px,1fr))] gap-[2px] text-[10px] text-muted-foreground">
            <span />
            {Array.from({ length: 24 }, (_, hour) => (
              <span key={hour} className="text-center tabular-nums">
                {hour % 3 === 0 ? hour : ""}
              </span>
            ))}
            {cells.map((hours, day) => (
              <div key={WEEKDAYS[day]} className="contents">
                <span className="flex items-center">{WEEKDAYS[day]}</span>
                {hours.map((cell, hour) => (
                  <Tooltip key={hour}>
                    <TooltipTrigger asChild>
                      <div
                        className="aspect-square rounded-[3px] bg-muted"
                        style={
                          cell.count
                            ? {
                                backgroundColor: "var(--chart-1)",
                                opacity: 0.2 + 0.8 * (cell.avgMs / max),
                              }
                            : undefined
                        }
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {WEEKDAYS[day]} {String(hour).padStart(2, "0")}:00 —{" "}
                      {cell.count ? `${cell.count} corrida(s), media ${formatDurationMs(cell.avgMs)}` : "sin corridas"}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
};
