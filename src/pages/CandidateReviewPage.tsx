import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { getFranchises } from "@/api/franchiseApi";
import Navbar from "@/components/Navbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import ApiErrorToast from "@/components/ui/api-error-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import LoadingOverlay from "@/components/ui/loading-overlay";
import PageControls from "@/components/ui/page-controls";
import CandidateReviewFormDialog, {
  ScrapedListingCandidate,
} from "@/components/candidateReview/CandidateReviewFormDialog";
import CandidateReviewTable from "@/components/candidateReview/CandidateReviewTable";
import type { FigureOption, SourceOption } from "@/components/figureAlias/FigureAliasFormDialog";
import { useReferenceData } from "@/hooks/useReferenceData";
import { authFetch } from "@/lib/apiClient";
import { ApiErrorResponse, readApiErrorResponse, toClientApiError } from "@/lib/apiError";
import { defaultPageMeta, getPageContent, getPageMeta, withPageSize, withPagination } from "@/lib/page";
import type { Franchise } from "@/types/franchise";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://figure-market-core.onrender.com/api";

const CANDIDATES_ENDPOINT = `${API_BASE_URL}/v1/scraping/candidates`;
const FIGURES_ENDPOINT = `${API_BASE_URL}/v1/figures`;
const SOURCES_ENDPOINT = `${API_BASE_URL}/v1/sources`;

const buildCandidatesEndpoint = (figureIdFilter: string) => {
  if (!figureIdFilter) return CANDIDATES_ENDPOINT;

  const separator = CANDIDATES_ENDPOINT.includes("?") ? "&" : "?";
  return `${CANDIDATES_ENDPOINT}${separator}figureId=${encodeURIComponent(figureIdFilter)}`;
};

const fallbackCurrencyCodes = [
  { value: "USD", label: "Usd", symbol: "$" },
  { value: "JPY", label: "Jpy", symbol: "JPY" },
];

const fallbackCandidateStatuses = [
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const fallbackListingStatuses = [
  { value: "ACTIVE", label: "Active" },
  { value: "SOLD_OUT", label: "Sold Out" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "UNKNOWN", label: "Unknown" },
];

const fallbackMatchDecisions = [
  { value: "REVIEW", label: "Review" },
  { value: "MATCH", label: "Match" },
  { value: "DISCARD", label: "Discard" },
];

type CandidateFigureOption = FigureOption & {
  franchiseId?: number;
  franchiseName?: string | null;
  franchise?: { id?: number; name?: string };
  primaryImageUrl?: string | null;
};

const getFigureFranchiseId = (figure?: CandidateFigureOption) =>
  figure?.franchiseId || figure?.franchise?.id;

const getFigureFranchiseName = (
  figure: CandidateFigureOption | undefined,
  franchisesById: Record<number, string>
) => {
  const franchiseId = getFigureFranchiseId(figure);
  return figure?.franchiseName || figure?.franchise?.name || (franchiseId ? franchisesById[franchiseId] : "");
};

const isCapturedWithinRange = (capturedAt: string | null | undefined, dateFrom: string, dateTo: string) => {
  if (!dateFrom && !dateTo) return true;
  if (!capturedAt) return false;

  const timestamp = new Date(capturedAt).getTime();
  if (Number.isNaN(timestamp)) return false;

  if (dateFrom && timestamp < new Date(`${dateFrom}T00:00:00`).getTime()) return false;
  if (dateTo && timestamp > new Date(`${dateTo}T23:59:59.999`).getTime()) return false;

  return true;
};

const CandidateReviewPage = () => {
  const [searchParams] = useSearchParams();
  const figureIdFilter = searchParams.get("figureId") || "";
  const [candidates, setCandidates] = useState<ScrapedListingCandidate[]>([]);
  const [figures, setFigures] = useState<CandidateFigureOption[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [search, setSearch] = useState("");
  const [franchiseFilter, setFranchiseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [displayCurrency, setDisplayCurrency] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [pageMeta, setPageMeta] = useState(defaultPageMeta);
  const [apiError, setApiError] = useState<ApiErrorResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ScrapedListingCandidate | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<ScrapedListingCandidate | null>(null);
  const [candidateToApprove, setCandidateToApprove] = useState<ScrapedListingCandidate | null>(null);
  const [candidateToReject, setCandidateToReject] = useState<ScrapedListingCandidate | null>(null);
  const { referenceData, loadingReferenceData } = useReferenceData();
  const mutating = saving || deleting || statusChanging;

  const fetchData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setLoadingOptions(true);
    }

    try {
      const [candidatesResponse, figuresResponse, sourcesResponse, franchisesData] = await Promise.all([
        authFetch(withPagination(buildCandidatesEndpoint(figureIdFilter), page, pageSize)),
        authFetch(withPageSize(FIGURES_ENDPOINT)),
        authFetch(withPageSize(SOURCES_ENDPOINT)),
        getFranchises().catch((error) => {
          console.error("Error fetching franchises:", error);
          return [];
        }),
      ]);

      if (candidatesResponse.ok) {
        const data = await candidatesResponse.json();
        setCandidates(getPageContent<ScrapedListingCandidate>(data));
        setPageMeta(getPageMeta<ScrapedListingCandidate>(data, pageSize));
      } else {
        console.error("Error fetching scraped listing candidates");
      }

      if (figuresResponse.ok) {
        const data = await figuresResponse.json();
        setFigures(getPageContent<CandidateFigureOption>(data));
      } else {
        console.error("Error fetching figures");
      }

      setFranchises(franchisesData);

      if (sourcesResponse.ok) {
        const data = await sourcesResponse.json();
        setSources(getPageContent<SourceOption>(data));
      } else {
        console.error("Error fetching sources");
      }
    } catch (error) {
      console.error("Request error fetching candidates:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
        setLoadingOptions(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [figureIdFilter, page, pageSize]);

  useEffect(() => {
    setPage(0);
  }, [figureIdFilter, franchiseFilter, statusFilter, dateFrom, dateTo, search]);

  const figuresById = useMemo<Record<number, CandidateFigureOption>>(
    () => Object.fromEntries(figures.map((figure) => [figure.id, figure])) as Record<number, CandidateFigureOption>,
    [figures]
  );

  const franchisesById = useMemo<Record<number, string>>(
    () => Object.fromEntries(franchises.map((franchise) => [franchise.id, franchise.name])) as Record<number, string>,
    [franchises]
  );

  const figureImagesById = useMemo<Record<number, string | null | undefined>>(
    () => Object.fromEntries(figures.map((figure) => [figure.id, figure.primaryImageUrl])),
    [figures]
  );

  const filteredCandidates = useMemo(() => {
    const figureFilteredCandidates = figureIdFilter
      ? candidates.filter((candidate) => String(candidate.figureId || "") === figureIdFilter)
      : candidates;
    const franchiseFilteredCandidates = franchiseFilter
      ? figureFilteredCandidates.filter((candidate) => {
          const figure = candidate.figureId ? figuresById[candidate.figureId] : undefined;
          return String(getFigureFranchiseId(figure) || "") === franchiseFilter;
        })
      : figureFilteredCandidates;
    const statusFilteredCandidates = statusFilter
      ? franchiseFilteredCandidates.filter((candidate) => candidate.status === statusFilter)
      : franchiseFilteredCandidates;
    const dateFilteredCandidates =
      dateFrom || dateTo
        ? statusFilteredCandidates.filter((candidate) =>
            isCapturedWithinRange(candidate.capturedAt, dateFrom, dateTo)
          )
        : statusFilteredCandidates;
    const query = search.trim().toLowerCase();
    if (!query) return dateFilteredCandidates;

    return dateFilteredCandidates.filter((candidate) => {
      const figure = candidate.figureId ? figuresById[candidate.figureId] : undefined;
      const franchiseName = getFigureFranchiseName(figure, franchisesById);

      return [
        candidate.id?.toString(),
        candidate.figureId?.toString(),
        candidate.figureName,
        candidate.figureSlug,
        franchiseName,
        candidate.sourceName,
        candidate.sourceCode,
        candidate.sourceItemId,
        candidate.sourceTitle,
        candidate.sourceUrl,
        candidate.status,
        candidate.matchDecision,
        candidate.listingStatus,
        candidate.productCode,
        candidate.janCode,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [
    candidates,
    figureIdFilter,
    figuresById,
    franchiseFilter,
    franchisesById,
    statusFilter,
    dateFrom,
    dateTo,
    search,
  ]);

  const openCreateDialog = () => {
    setSelectedCandidate(null);
    setDialogOpen(true);
  };

  const openViewDialog = (candidate: ScrapedListingCandidate) => {
    setSelectedCandidate(candidate);
    setDialogOpen(true);
  };

  const handleSubmit = async (payload: Record<string, string | number | boolean>) => {
    setSaving(true);

    const isEditing = Boolean(selectedCandidate?.id);
    const endpoint = isEditing
      ? `${CANDIDATES_ENDPOINT}/${selectedCandidate?.id}`
      : CANDIDATES_ENDPOINT;

    try {
      const response = await authFetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, "Error saving candidate."));
        return;
      }

      await fetchData(false);
      setDialogOpen(false);
      setSelectedCandidate(null);
    } catch (error) {
      console.error("Request error:", error);
      setApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!candidateToDelete?.id) return;
    setDeleting(true);

    try {
      const response = await authFetch(`${CANDIDATES_ENDPOINT}/${candidateToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, "Error deleting candidate."));
        return;
      }

      await fetchData(false);
      setCandidateToDelete(null);
    } catch (error) {
      console.error("Request error:", error);
      setApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setDeleting(false);
    }
  };

  const updateCandidateDecision = async (
    candidate: ScrapedListingCandidate | null,
    action: "approve" | "reject"
  ) => {
    if (!candidate?.id) return;
    setStatusChanging(true);

    try {
      const response = await authFetch(`${CANDIDATES_ENDPOINT}/${candidate.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNotes: candidate.reviewNotes || "" }),
      });

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, `Error trying to ${action} candidate.`));
        return;
      }

      await fetchData(false);
      setCandidateToApprove(null);
      setCandidateToReject(null);
    } catch (error) {
      console.error("Request error:", error);
      setApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setStatusChanging(false);
    }
  };

  const candidateStatusOptions =
    referenceData.scrapedListingCandidateStatuses.length > 0
      ? referenceData.scrapedListingCandidateStatuses
      : fallbackCandidateStatuses;
  const currencyOptions =
    referenceData.currencyCodes.length > 0 ? referenceData.currencyCodes : fallbackCurrencyCodes;

  const hasActiveFilters = Boolean(
    figureIdFilter || franchiseFilter || statusFilter || dateFrom || dateTo
  );

  const clearFilters = () => {
    setFranchiseFilter("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ApiErrorToast error={apiError} onClose={() => setApiError(null)} />

      <main className="container py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Candidate Review</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Review scraped candidates before approving them as figure source listings.
            </p>
          </div>

          <Button type="button" className="gap-2 md:self-center" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            New Candidate
          </Button>
        </div>

        <div className="sticky top-20 z-40 mt-6 flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidates"
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={franchiseFilter}
              onChange={(event) => setFranchiseFilter(event.target.value)}
              className="w-full rounded border border-input bg-background p-2 text-sm text-foreground"
            >
              <option value="">All franchises</option>
              {franchises.map((franchise) => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded border border-input bg-background p-2 text-sm text-foreground"
            >
              <option value="">All statuses</option>
              {candidateStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <Input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
              className="text-sm"
              aria-label="Captured from"
            />

            <Input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
              className="text-sm"
              aria-label="Captured to"
            />

            <select
              value={displayCurrency}
              onChange={(event) => setDisplayCurrency(event.target.value)}
              className="w-full rounded border border-input bg-background p-2 text-sm text-foreground"
            >
              <option value="">Original currency</option>
              {currencyOptions.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  Show all in {currency.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {filteredCandidates.length} shown - {pageMeta.totalElements} total records
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {figureIdFilter && (
                <Badge variant="secondary" className="w-fit">
                  Figure ID {figureIdFilter}
                </Badge>
              )}
              {franchiseFilter && (
                <Badge variant="secondary" className="w-fit">
                  {franchisesById[Number(franchiseFilter)] || `Franchise ID ${franchiseFilter}`}
                </Badge>
              )}
              {statusFilter && (
                <Badge variant="secondary" className="w-fit">
                  {candidateStatusOptions.find((status) => status.value === statusFilter)?.label ||
                    statusFilter}
                </Badge>
              )}
              {(dateFrom || dateTo) && (
                <Badge variant="secondary" className="w-fit">
                  {dateFrom || "..."} to {dateTo || "..."}
                </Badge>
              )}
              {hasActiveFilters && (
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </div>

        <LoadingOverlay active={mutating} message="Updating candidates..." className="mt-4">
          <CandidateReviewTable
            candidates={filteredCandidates}
            loading={loading}
            displayCurrency={displayCurrency}
            figureImagesById={figureImagesById}
            onView={openViewDialog}
            onApprove={setCandidateToApprove}
            onReject={setCandidateToReject}
            onDelete={setCandidateToDelete}
          />
        </LoadingOverlay>

        <div className="mt-4">
          <PageControls
            page={pageMeta.page}
            size={pageMeta.size}
            totalElements={pageMeta.totalElements}
            totalPages={pageMeta.totalPages}
            disabled={loading || mutating}
            onPageChange={setPage}
            onSizeChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
          />
        </div>
      </main>

      <CandidateReviewFormDialog
        candidate={selectedCandidate}
        figures={figures}
        sources={sources}
        open={dialogOpen}
        saving={saving}
        loadingOptions={loadingOptions || loadingReferenceData}
        currencyCodes={currencyOptions}
        candidateStatuses={candidateStatusOptions}
        listingStatuses={
          referenceData.figureSourceListingStatuses.length > 0
            ? referenceData.figureSourceListingStatuses
            : fallbackListingStatuses
        }
        matchDecisions={
          referenceData.matchDecisions.length > 0 ? referenceData.matchDecisions : fallbackMatchDecisions
        }
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={Boolean(candidateToDelete)}
        onOpenChange={(open) => {
          if (!open) setCandidateToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete "{candidateToDelete?.sourceTitle || "this candidate"}" from the
              database. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(candidateToApprove)}
        onOpenChange={(open) => {
          if (!open) setCandidateToApprove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve "{candidateToApprove?.sourceTitle || "this candidate"}" and create or update
              the related figure source listing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusChanging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={statusChanging}
              onClick={() => updateCandidateDecision(candidateToApprove, "approve")}
            >
              {statusChanging ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(candidateToReject)}
        onOpenChange={(open) => {
          if (!open) setCandidateToReject(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark "{candidateToReject?.sourceTitle || "this candidate"}" as rejected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusChanging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={statusChanging}
              onClick={() => updateCandidateDecision(candidateToReject, "reject")}
            >
              {statusChanging ? "Rejecting..." : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CandidateReviewPage;
