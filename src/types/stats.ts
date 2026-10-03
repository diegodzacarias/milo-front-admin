export type CountMap = Record<string, number>;

export type FranchiseFigureCount = {
    franchiseId: number | null;
    franchiseName: string | null;
    total: number;
    discovered: number;
    manual: number;
};

export type SourceListingCount = {
    sourceCode: string;
    sourceName: string;
    total: number;
    byStatus: CountMap;
};

export type ListingsPerFigureBucket = "0" | "1" | "2-5" | "6-10" | "11+";

export type CatalogStats = {
    totalFigures: number;
    totalListings: number;
    figuresWithoutListings: number;
    figuresWithoutImage: number;
    staleDays: number;
    staleListings: number;
    figuresByFranchise: FranchiseFigureCount[];
    listingsByStatus: CountMap;
    listingsBySource: SourceListingCount[];
    listingsPerFigureDistribution: Record<ListingsPerFigureBucket, number>;
    discoveryCandidatesByStatus: CountMap;
};

export type FigureListingStat = {
    figureId: number;
    figureName: string;
    franchiseName: string | null;
    listingCount: number;
    activeListingCount: number;
};

export type SortOrder = "asc" | "desc";

export type FigureListingStatsParams = {
    franchiseId?: number | null;
    order: SortOrder;
    page: number;
    size: number;
};

export type DateRange = {
    from: string;
    to: string;
};

export type RankedItem = {
    id: number | null;
    label: string;
    count: number;
};

export type UsageStats = {
    from: string;
    to: string;
    totalEvents: number;
    uniqueSessions: number;
    eventsByType: CountMap;
    byCountry: { country: string | null; events: number; sessions: number }[];
    daily: { date: string; events: number; sessions: number }[];
    topFigures: RankedItem[];
    topFranchises: RankedItem[];
    topSearches: RankedItem[];
};

export type ScrapingSourceStats = {
    sourceCode: string;
    runs: number;
    runsByStatus: CountMap;
    failureRate: number;
    queries: number;
    avgQueryDurationMs: number | null;
    results: number;
    autoMatches: number;
    reviews: number;
    discards: number;
    noResultQueries: number;
    failedQueries: number;
    autoMatchRate: number;
};

export type ScrapingStats = {
    from: string;
    to: string;
    totalRuns: number;
    failedRuns: number;
    bySource: ScrapingSourceStats[];
    daily: { date: string; runs: number; failed: number }[];
    topErrors: { sourceCode: string; errorMessage: string; count: number }[];
    zeroResultQueries: { query: string; sourceCode: string; executions: number }[];
};

export type ScrapingCycleType = "DISCOVERY" | "LISTING";
export type ScrapingCycleTrigger = "SCHEDULED" | "MANUAL";
export type ScrapingCycleStatus = "RUNNING" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "INTERRUPTED";

export type ScrapingCycle = {
    id: number;
    type: ScrapingCycleType;
    trigger: ScrapingCycleTrigger | null;
    status: ScrapingCycleStatus;
    startedAt: string;
    finishedAt: string | null;
    durationMs: number | null;
    sourceCount: number;
    totalCount: number;
    createdCount: number;
    updatedCount: number;
    pendingReviewCount: number;
    failedCount: number;
    closedEarly: boolean;
    failureMessage: string | null;
};

export type DiscoverySourceSummary = {
    sourceCode: string;
    franchiseName: string;
    discovered: number;
    created: number;
    statusUpdated: number;
    unchanged: number;
    skippedBelowPriceThreshold: number;
    pendingDuplicateReview: number;
    failed: number;
};

export type ScrapingCycleDetail = {
    cycle: ScrapingCycle;
    summary: {
        plannedSources: string[];
        discoverySources: DiscoverySourceSummary[];
        listingSources: { sourceCode: string; countsByStatus: CountMap }[];
        newFigures: string[];
        errors: string[];
    } | null;
};

export type ScrapingCyclesParams = {
    type?: ScrapingCycleType | null;
    page: number;
    size: number;
};
