import { apiRequest } from "@/lib/apiClient";
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

export function getCatalogStats(staleDays = 14): Promise<CatalogStats> {
    return apiRequest<CatalogStats>("/v1/stats/catalog", {
        query: { staleDays },
        fallbackMessage: "Error fetching catalog statistics.",
    });
}

export function getFigureListingStats({
    franchiseId,
    order,
    page,
    size,
}: FigureListingStatsParams): Promise<PageResponse<FigureListingStat>> {
    return apiRequest<PageResponse<FigureListingStat>>("/v1/stats/figures/listings", {
        query: { franchiseId, order, page, size },
        fallbackMessage: "Error fetching listings per figure.",
    });
}

export function getUsageStats(range: DateRange): Promise<UsageStats> {
    return apiRequest<UsageStats>("/v1/stats/usage", {
        query: { from: range.from, to: range.to },
        fallbackMessage: "Error fetching usage statistics.",
    });
}

export function getScrapingStats(range: DateRange): Promise<ScrapingStats> {
    return apiRequest<ScrapingStats>("/v1/stats/scraping", {
        query: { from: range.from, to: range.to },
        fallbackMessage: "Error fetching scraping statistics.",
    });
}

export function getScrapingCycles({ type, page, size }: ScrapingCyclesParams): Promise<PageResponse<ScrapingCycle>> {
    return apiRequest<PageResponse<ScrapingCycle>>("/v1/scraping/cycles", {
        query: { type, page, size },
        fallbackMessage: "Error fetching scraping cycles.",
    });
}

export function getScrapingCycleDetail(id: number): Promise<ScrapingCycleDetail> {
    return apiRequest<ScrapingCycleDetail>(`/v1/scraping/cycles/${id}`, {
        fallbackMessage: "Error fetching scraping cycle detail.",
    });
}
