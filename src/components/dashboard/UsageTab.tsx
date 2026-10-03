import { useMemo } from "react";
import { eachDayOfInterval, format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUsageStats } from "@/hooks/useStats";
import { toIsoDate } from "@/lib/date";
import type { DateRange, RankedItem, UsageStats } from "@/types/stats";
import {
  ChartCard,
  ChartSkeleton,
  EmptyState,
  KpiCard,
  SectionError,
  TableSkeleton,
  countryFlag,
  countryName,
  formatNumber,
  useReportQueryError,
  type ReportError,
} from "./dashboardUtils";

const dailyConfig = {
  events: { label: "Eventos", color: "var(--chart-1)" },
  sessions: { label: "Sesiones", color: "var(--chart-2)" },
} satisfies ChartConfig;

// El backend solo envía los días con datos: se completa el rango con ceros.
function fillDaily(usage: UsageStats | undefined) {
  if (!usage) return [];
  const from = parseISO(usage.from);
  const to = parseISO(usage.to);
  if (!isValid(from) || !isValid(to) || from > to) return usage.daily ?? [];

  const byDate = new Map((usage.daily ?? []).map((day) => [day.date, day]));
  return eachDayOfInterval({ start: from, end: to }).map((day) => {
    const date = toIsoDate(day);
    const entry = byDate.get(date);
    return { date, events: entry?.events ?? 0, sessions: entry?.sessions ?? 0 };
  });
}

const formatDayTick = (value: string) => format(parseISO(value), "dd/MM");
const formatDayLabel = (value?: string) => (value ? format(parseISO(value), "EEE d 'de' MMM", { locale: es }) : "");

function RankedList({
  title,
  items,
  loading,
  emptyMessage,
}: {
  title: string;
  items: RankedItem[] | undefined;
  loading: boolean;
  emptyMessage: string;
}) {
  const rows = (items ?? []).slice(0, 10);
  const max = Math.max(1, ...rows.map((item) => item.count));

  return (
    <ChartCard title={title}>
      {loading ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState>{emptyMessage}</EmptyState>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((item, index) => (
            <li key={`${item.id ?? item.label}-${index}`} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{index + 1}.</span>
                  <span className="truncate" title={item.label}>
                    {item.label || "(vacío)"}
                  </span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">{formatNumber(item.count)}</span>
              </div>
              <div className="ml-7 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(item.count / max) * 100}%`, backgroundColor: "var(--chart-1)" }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </ChartCard>
  );
}

type UsageTabProps = {
  range: DateRange | null;
  onError: ReportError;
};

const UsageTab = ({ range, onError }: UsageTabProps) => {
  const usage = useUsageStats(range);
  useReportQueryError(usage.error, onError, "Error fetching usage statistics.");

  const data = usage.data;
  const loading = usage.isLoading && range !== null;
  const daily = useMemo(() => fillDaily(data), [data]);
  const countries = useMemo(() => [...(data?.byCountry ?? [])].sort((a, b) => b.events - a.events), [data]);
  const maxCountryEvents = Math.max(1, ...countries.map((country) => country.events));

  if (usage.isError) {
    return <SectionError error={usage.error} fallbackMessage="Error fetching usage statistics." onRetry={() => usage.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Eventos" value={formatNumber(data?.totalEvents)} loading={loading} />
        <KpiCard label="Sesiones únicas" value={formatNumber(data?.uniqueSessions)} loading={loading} />
        <KpiCard label="Clics en figuras" value={formatNumber(data?.eventsByType?.FIGURE_CLICK ?? 0)} loading={loading} />
        <KpiCard label="Clics en franquicias" value={formatNumber(data?.eventsByType?.FRANCHISE_CLICK ?? 0)} loading={loading} />
      </div>

      <ChartCard title="Actividad diaria" description="Eventos y sesiones por día (días sin actividad en 0).">
        {loading ? (
          <ChartSkeleton />
        ) : daily.length === 0 ? (
          <EmptyState>Sin actividad en este rango.</EmptyState>
        ) : (
          <ChartContainer config={dailyConfig} className="aspect-auto h-[280px] w-full">
            <AreaChart data={daily} margin={{ left: -12, right: 8 }}>
              <defs>
                <linearGradient id="fill-events" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-events)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-events)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fill-sessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-sessions)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-sessions)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={formatDayTick} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={<ChartTooltipContent indicator="line" labelFormatter={(_, payload) => formatDayLabel(payload?.[0]?.payload?.date)} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area dataKey="events" type="monotone" stroke="var(--color-events)" strokeWidth={2} fill="url(#fill-events)" />
              <Area dataKey="sessions" type="monotone" stroke="var(--color-sessions)" strokeWidth={2} fill="url(#fill-sessions)" />
            </AreaChart>
          </ChartContainer>
        )}
      </ChartCard>

      <ChartCard title="Por país" description="Según la geolocalización de la sesión.">
        {loading ? (
          <TableSkeleton />
        ) : countries.length === 0 ? (
          <EmptyState>Sin datos de país en este rango.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>País</TableHead>
                <TableHead className="min-w-[140px]" />
                <TableHead className="text-right">Eventos</TableHead>
                <TableHead className="text-right">Sesiones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countries.map((country) => (
                <TableRow key={country.country ?? "unknown"}>
                  <TableCell className="whitespace-nowrap">
                    <span className="mr-2 text-base" aria-hidden>
                      {countryFlag(country.country)}
                    </span>
                    {countryName(country.country)}
                    {country.country && <span className="ml-1.5 text-xs text-muted-foreground">{country.country}</span>}
                  </TableCell>
                  <TableCell>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(country.events / maxCountryEvents) * 100}%`, backgroundColor: "var(--chart-1)" }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(country.events)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(country.sessions)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <RankedList title="Top 10 figuras" items={data?.topFigures} loading={loading} emptyMessage="Sin clics en figuras en este rango" />
        <RankedList
          title="Top franquicias"
          items={data?.topFranchises}
          loading={loading}
          emptyMessage="Sin clics en franquicias en este rango"
        />
        <RankedList title="Top búsquedas" items={data?.topSearches} loading={loading} emptyMessage="Sin búsquedas en este rango" />
      </div>
    </div>
  );
};

export default UsageTab;
