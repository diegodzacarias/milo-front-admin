import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import PageControls from "@/components/ui/page-controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFranchises } from "@/hooks/useFranchises";
import { useCatalogStats, useFigureListingStats } from "@/hooks/useStats";
import { getPageContent, getPageMeta } from "@/lib/page";
import { cn } from "@/lib/utils";
import type { ListingsPerFigureBucket, SortOrder } from "@/types/stats";
import {
  ChartCard,
  ChartSkeleton,
  EmptyState,
  SectionError,
  StackedBar,
  TableSkeleton,
  formatNumber,
  listingStatusMeta,
  orderedStatusEntries,
  useReportQueryError,
  type ReportError,
} from "./dashboardUtils";

const BUCKETS: ListingsPerFigureBucket[] = ["0", "1", "2-5", "6-10", "11+"];

const distributionConfig = {
  figures: { label: "Figuras", color: "var(--chart-1)" },
} satisfies ChartConfig;

const ALL_FRANCHISES = "all";

const CatalogTab = ({ onError }: { onError: ReportError }) => {
  const navigate = useNavigate();
  const catalog = useCatalogStats();
  const franchises = useFranchises();
  const [franchiseId, setFranchiseId] = useState(ALL_FRANCHISES);
  const [order, setOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);

  const figureListings = useFigureListingStats({
    franchiseId: franchiseId === ALL_FRANCHISES ? null : Number(franchiseId),
    order,
    page,
    size,
  });

  useReportQueryError(catalog.error, onError, "Error fetching catalog statistics.");
  useReportQueryError(figureListings.error, onError, "Error fetching listings per figure.");

  const data = catalog.data;

  const distribution = useMemo(
    () =>
      BUCKETS.map((bucket) => ({
        bucket: bucket === "1" ? "1 listing" : bucket === "0" ? "Sin listings" : `${bucket} listings`,
        figures: data?.listingsPerFigureDistribution?.[bucket] ?? 0,
      })),
    [data],
  );

  const sources = useMemo(
    () => [...(data?.listingsBySource ?? [])].sort((a, b) => b.total - a.total),
    [data],
  );

  // Estados presentes en cualquier fuente, para la leyenda de la tabla.
  const sourceStatuses = useMemo(() => {
    const merged: Record<string, number> = {};
    sources.forEach((source) =>
      Object.entries(source.byStatus ?? {}).forEach(([status, count]) => {
        merged[status] = (merged[status] ?? 0) + count;
      }),
    );
    return orderedStatusEntries(merged).filter(([, count]) => count > 0).map(([status]) => status);
  }, [sources]);

  const figureRows = getPageContent(figureListings.data);
  const pageMeta = getPageMeta(figureListings.data, size);

  return (
    <div className="space-y-6">
      {catalog.isError && (
        <SectionError error={catalog.error} fallbackMessage="Error fetching catalog statistics." onRetry={() => catalog.refetch()} />
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <ChartCard
          title="Listings por figura"
          description="Cuántas figuras tienen 0, 1 o varios listings."
          className="lg:col-span-2"
        >
          {catalog.isLoading ? (
            <ChartSkeleton />
          ) : (
            <ChartContainer config={distributionConfig} className="aspect-auto h-[260px] w-full">
              <BarChart data={distribution} margin={{ top: 20, left: -12, right: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="bucket" tickLine={false} axisLine={false} interval={0} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="figures" fill="var(--color-figures)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="figures" position="top" className="fill-muted-foreground" fontSize={11} />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>

        <ChartCard title="Listings por fuente" description="Total por marketplace y su reparto por estado." className="lg:col-span-3">
          {catalog.isLoading ? (
            <TableSkeleton />
          ) : sources.length === 0 ? (
            <EmptyState>Sin listings por fuente.</EmptyState>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {sourceStatuses.map((status) => (
                  <span key={status} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: listingStatusMeta(status).color }} />
                    {listingStatusMeta(status).label}
                  </span>
                ))}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fuente</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="min-w-[180px]">Por estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((source) => (
                    <TableRow key={source.sourceCode}>
                      <TableCell className="whitespace-nowrap font-medium">{source.sourceName || source.sourceCode}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(source.total)}</TableCell>
                      <TableCell>
                        <StackedBar
                          segments={orderedStatusEntries(source.byStatus).map(([status, count]) => ({
                            key: status,
                            label: listingStatusMeta(status).label,
                            value: count,
                            color: listingStatusMeta(status).color,
                          }))}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Listings por figura"
        description="Haz clic en una figura para ver su detalle."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={franchiseId}
              onValueChange={(value) => {
                setFranchiseId(value);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Franquicia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FRANCHISES}>Todas las franquicias</SelectItem>
                {(franchises.data ?? []).map((franchise) => (
                  <SelectItem key={franchise.id} value={String(franchise.id)}>
                    {franchise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={order}
              onValueChange={(value) => {
                if (!value) return;
                setOrder(value as SortOrder);
                setPage(0);
              }}
              aria-label="Orden"
            >
              <ToggleGroupItem value="desc">Más listings</ToggleGroupItem>
              <ToggleGroupItem value="asc">Menos listings</ToggleGroupItem>
            </ToggleGroup>
          </div>
        }
      >
        {figureListings.isError ? (
          <SectionError
            error={figureListings.error}
            fallbackMessage="Error fetching listings per figure."
            onRetry={() => figureListings.refetch()}
          />
        ) : figureListings.isLoading ? (
          <TableSkeleton rows={8} />
        ) : figureRows.length === 0 ? (
          <EmptyState>No hay figuras para este filtro.</EmptyState>
        ) : (
          <div className="space-y-4">
            <div className={cn("transition-opacity", figureListings.isPlaceholderData && "opacity-60")}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Figura</TableHead>
                    <TableHead>Franquicia</TableHead>
                    <TableHead className="text-right">Listings</TableHead>
                    <TableHead className="text-right">Activos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {figureRows.map((row) => (
                    <TableRow
                      key={row.figureId}
                      className="cursor-pointer"
                      onClick={() => navigate(`/figure/${row.figureId}`)}
                    >
                      <TableCell className="min-w-[200px] font-medium">{row.figureName}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{row.franchiseName ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.listingCount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.activeListingCount)}</TableCell>
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
              disabled={figureListings.isFetching}
              onPageChange={setPage}
              onSizeChange={(nextSize) => {
                setSize(nextSize);
                setPage(0);
              }}
            />
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default CatalogTab;
