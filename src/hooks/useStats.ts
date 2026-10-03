import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
    getCatalogStats,
    getFigureListingStats,
    getScrapingCycleDetail,
    getScrapingCycles,
    getScrapingStats,
    getUsageStats,
} from "@/api/statsApi";
import type { PageResponse } from "@/lib/page";
import type {
    CatalogStats,
    DateRange,
    FigureListingStat,
    FigureListingStatsParams,
    ScrapingCycle,
    ScrapingCycleDetail,
    ScrapingCyclesParams,
    ScrapingStats,
    UsageStats,
} from "@/types/stats";

// Las estadísticas no cambian segundo a segundo: evita refetch en cada foco de ventana.
const STATS_STALE_TIME = 60_000;

export function useCatalogStats(staleDays = 14) {
    return useQuery<CatalogStats>({
        queryKey: ["stats", "catalog", staleDays],
        queryFn: () => getCatalogStats(staleDays),
        staleTime: STATS_STALE_TIME,
    });
}

export function useFigureListingStats(params: FigureListingStatsParams) {
    return useQuery<PageResponse<FigureListingStat>>({
        queryKey: ["stats", "figure-listings", params],
        queryFn: () => getFigureListingStats(params),
        placeholderData: keepPreviousData,
        staleTime: STATS_STALE_TIME,
    });
}

// range = null cuando el rango elegido es inválido: la query queda deshabilitada.
export function useUsageStats(range: DateRange | null) {
    return useQuery<UsageStats>({
        queryKey: ["stats", "usage", range],
        queryFn: () => getUsageStats(range as DateRange),
        enabled: range !== null,
        staleTime: STATS_STALE_TIME,
    });
}

export function useScrapingStats(range: DateRange | null) {
    return useQuery<ScrapingStats>({
        queryKey: ["stats", "scraping", range],
        queryFn: () => getScrapingStats(range as DateRange),
        enabled: range !== null,
        staleTime: STATS_STALE_TIME,
    });
}

export function useScrapingCycles(params: ScrapingCyclesParams) {
    return useQuery<PageResponse<ScrapingCycle>>({
        queryKey: ["scraping-cycles", params],
        queryFn: () => getScrapingCycles(params),
        placeholderData: keepPreviousData,
        staleTime: STATS_STALE_TIME,
    });
}

export function useScrapingCycleDetail(id: number | null) {
    return useQuery<ScrapingCycleDetail>({
        queryKey: ["scraping-cycles", "detail", id],
        queryFn: () => getScrapingCycleDetail(id as number),
        enabled: id !== null,
    });
}
