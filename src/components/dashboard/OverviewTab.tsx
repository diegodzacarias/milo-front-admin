import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useCatalogStats, useUsageStats } from "@/hooks/useStats";
import type { DateRange } from "@/types/stats";
import {
  ChartCard,
  ChartSkeleton,
  EmptyState,
  KpiCard,
  SectionError,
  formatNumber,
  listingStatusMeta,
  orderedStatusEntries,
  useReportQueryError,
  type ReportError,
} from "./dashboardUtils";

const MAX_FRANCHISES = 12;

const franchiseChartConfig = {
  discovered: { label: "Discovery", color: "var(--chart-1)" },
  manual: { label: "Manual", color: "var(--chart-2)" },
} satisfies ChartConfig;

type OverviewTabProps = {
  range: DateRange | null;
  onError: ReportError;
};

const OverviewTab = ({ range, onError }: OverviewTabProps) => {
  const catalog = useCatalogStats();
  const usage = useUsageStats(range);
  useReportQueryError(catalog.error, onError, "Error fetching catalog statistics.");
  useReportQueryError(usage.error, onError, "Error fetching usage statistics.");

  const data = catalog.data;

  // Top franquicias por total; el resto se agrupa en "Otras" para no saturar el eje.
  const franchiseRows = useMemo(() => {
    const rows = [...(data?.figuresByFranchise ?? [])]
      .sort((a, b) => b.total - a.total)
      .map((row) => ({
        name: row.franchiseName ?? "Sin franquicia",
        discovered: row.discovered,
        manual: row.manual,
      }));
    if (rows.length <= MAX_FRANCHISES) return rows;
    const rest = rows.slice(MAX_FRANCHISES - 1);
    return [
      ...rows.slice(0, MAX_FRANCHISES - 1),
      {
        name: `Otras (${rest.length})`,
        discovered: rest.reduce((sum, row) => sum + row.discovered, 0),
        manual: rest.reduce((sum, row) => sum + row.manual, 0),
      },
    ];
  }, [data]);

  const statusRows = useMemo(
    () =>
      orderedStatusEntries(data?.listingsByStatus)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({ status, count, fill: listingStatusMeta(status).color })),
    [data],
  );

  const statusConfig = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        statusRows.map((row) => [row.status, { label: listingStatusMeta(row.status).label, color: row.fill }]),
      ),
    [statusRows],
  );

  const statusTotal = statusRows.reduce((sum, row) => sum + row.count, 0);
  const pendingDiscovery = data?.discoveryCandidatesByStatus?.PENDING_REVIEW ?? 0;

  return (
    <div className="space-y-6">
      {catalog.isError && (
        <SectionError error={catalog.error} fallbackMessage="Error fetching catalog statistics." onRetry={() => catalog.refetch()} />
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Figuras totales" value={formatNumber(data?.totalFigures)} loading={catalog.isLoading} />
        <KpiCard label="Listings totales" value={formatNumber(data?.totalListings)} loading={catalog.isLoading} />
        <KpiCard
          label="Figuras sin listings"
          value={formatNumber(data?.figuresWithoutListings)}
          loading={catalog.isLoading}
          hint={data ? `${formatNumber(data.figuresWithoutImage)} sin imagen` : undefined}
        />
        <KpiCard
          label="Listings desactualizados"
          value={formatNumber(data?.staleListings)}
          loading={catalog.isLoading}
          hint={
            data ? (
              data.staleListings > 0 ? (
                <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  &gt; {data.staleDays} días sin actualizar
                </Badge>
              ) : (
                `Ninguno con más de ${data.staleDays} días`
              )
            ) : undefined
          }
        />
        <KpiCard
          label="Discovery pendientes"
          value={formatNumber(pendingDiscovery)}
          loading={catalog.isLoading}
          hint="Candidatos por revisar"
        />
        <KpiCard
          label="Sesiones del rango"
          value={usage.isError ? "—" : formatNumber(usage.data?.uniqueSessions)}
          loading={usage.isLoading && range !== null}
          hint={usage.isError ? "No disponible" : "Sesiones únicas"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <ChartCard
          title="Figuras por franquicia"
          description="Origen de cada figura: Discovery automático vs alta manual."
          className="lg:col-span-3"
        >
          {catalog.isLoading ? (
            <ChartSkeleton className="h-[360px]" />
          ) : franchiseRows.length === 0 ? (
            <EmptyState>Sin figuras registradas.</EmptyState>
          ) : (
            <ChartContainer
              config={franchiseChartConfig}
              className="aspect-auto w-full"
              style={{ height: Math.max(220, franchiseRows.length * 30 + 60) }}
            >
              <BarChart data={franchiseRows} layout="vertical" margin={{ left: 0, right: 12 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: string) => (value.length > 18 ? `${value.slice(0, 17)}…` : value)}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="discovered" stackId="origin" fill="var(--color-discovered)" stroke="hsl(var(--card))" strokeWidth={1} />
                <Bar
                  dataKey="manual"
                  stackId="origin"
                  fill="var(--color-manual)"
                  stroke="hsl(var(--card))"
                  strokeWidth={1}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>

        <ChartCard title="Listings por estado" description="Distribución actual de todos los listings." className="lg:col-span-2">
          {catalog.isLoading ? (
            <ChartSkeleton className="h-[300px]" />
          ) : statusTotal === 0 ? (
            <EmptyState>Sin listings registrados.</EmptyState>
          ) : (
            <ChartContainer config={statusConfig} className="mx-auto aspect-square max-h-[320px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="status" hideLabel />} />
                <Pie
                  data={statusRows}
                  dataKey="count"
                  nameKey="status"
                  innerRadius="58%"
                  strokeWidth={2}
                  stroke="hsl(var(--card))"
                >
                  {statusRows.map((row) => (
                    <Cell key={row.status} fill={row.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                            {formatNumber(statusTotal)}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 22} className="fill-muted-foreground text-xs">
                            listings
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="status" />} className="flex-wrap gap-2" />
              </PieChart>
            </ChartContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default OverviewTab;
