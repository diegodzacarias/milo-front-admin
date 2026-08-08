import { useEffect, useMemo, useState } from "react";
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
import type { FigureOption, SourceOption } from "@/components/figureAlias/FigureAliasFormDialog";
import FigureSourceListingFormDialog, {
  FigureSourceListing,
} from "@/components/figureSourceListing/FigureSourceListingFormDialog";
import FigureSourceListingTable from "@/components/figureSourceListing/FigureSourceListingTable";
import { useReferenceData } from "@/hooks/useReferenceData";
import { authFetch } from "@/lib/apiClient";
import { ApiErrorResponse, readApiErrorResponse, toClientApiError } from "@/lib/apiError";
import { defaultPageMeta, getPageContent, getPageMeta, withPageSize, withPagination } from "@/lib/page";
import type { Franchise } from "@/types/franchise";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://figure-market-core.onrender.com/api";

const FIGURES_ENDPOINT = `${API_BASE_URL}/v1/figures`;
const FIGURE_SOURCE_LISTINGS_ENDPOINT = `${API_BASE_URL}/v1/figure-source-listings`;
const SOURCES_ENDPOINT = `${API_BASE_URL}/v1/sources`;

type ListingFigureOption = FigureOption & {
  franchiseId?: number;
  franchiseName?: string | null;
  franchise?: { id?: number; name?: string };
  primaryImageUrl?: string | null;
};

const getFigureFranchiseId = (figure?: ListingFigureOption) =>
  figure?.franchiseId || figure?.franchise?.id;

const fallbackCurrencyCodes = [
  { value: "USD", label: "Usd", symbol: "$" },
  { value: "JPY", label: "Jpy", symbol: "¥" },
];

const fallbackListingStatuses = [
  { value: "ACTIVE", label: "Active" },
  { value: "SOLD_OUT", label: "Sold Out" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "UNKNOWN", label: "Unknown" },
];

const fallbackLoadMethods = [
  { value: "MANUAL", label: "Manual" },
  { value: "SCRAPED", label: "Scraped" },
  { value: "GENERATED", label: "Generated" },
  { value: "IMPORTED", label: "Imported" },
];

const FigureSourceListingPage = () => {
  const [listings, setListings] = useState<FigureSourceListing[]>([]);
  const [figures, setFigures] = useState<ListingFigureOption[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [franchiseFilter, setFranchiseFilter] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [pageMeta, setPageMeta] = useState(defaultPageMeta);
  const [apiError, setApiError] = useState<ApiErrorResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<FigureSourceListing | null>(null);
  const [listingToDelete, setListingToDelete] = useState<FigureSourceListing | null>(null);
  const { referenceData, loadingReferenceData } = useReferenceData();
  const mutating = saving || deleting;

  const fetchData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setLoadingOptions(true);
    }

    try {
      const [listingsResponse, figuresResponse, sourcesResponse, franchisesData] = await Promise.all([
        authFetch(withPagination(FIGURE_SOURCE_LISTINGS_ENDPOINT, page, pageSize)),
        authFetch(withPageSize(FIGURES_ENDPOINT)),
        authFetch(withPageSize(SOURCES_ENDPOINT)),
        getFranchises().catch((error) => {
          console.error("Error fetching franchises:", error);
          return [];
        }),
      ]);

      if (listingsResponse.ok) {
        const data = await listingsResponse.json();
        setListings(getPageContent<FigureSourceListing>(data));
        setPageMeta(getPageMeta<FigureSourceListing>(data, pageSize));
      } else {
        console.error("Error fetching figure source listings");
      }

      if (figuresResponse.ok) {
        const data = await figuresResponse.json();
        setFigures(getPageContent<ListingFigureOption>(data));
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
      console.error("Request error fetching figure source listings:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
        setLoadingOptions(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize]);

  useEffect(() => {
    setPage(0);
  }, [franchiseFilter, search]);

  const figuresById = useMemo<Record<number, ListingFigureOption>>(
    () => Object.fromEntries(figures.map((figure) => [figure.id, figure])) as Record<number, ListingFigureOption>,
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

  const filteredListings = useMemo(() => {
    const franchiseFilteredListings = franchiseFilter
      ? listings.filter((listing) => {
          const figure = listing.figureId ? figuresById[listing.figureId] : undefined;
          return String(getFigureFranchiseId(figure) || "") === franchiseFilter;
        })
      : listings;

    const query = search.trim().toLowerCase();

    if (!query) return franchiseFilteredListings;

    return franchiseFilteredListings.filter((listing) =>
      [
        listing.id?.toString(),
        listing.figureName,
        listing.figureSlug,
        listing.sourceName,
        listing.sourceItemId,
        listing.sourceTitle,
        listing.sourceUrl,
        listing.currencyCode,
        listing.listingStatus,
        listing.loadMethod,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [figuresById, franchiseFilter, listings, search]);

  const hasActiveFilters = Boolean(franchiseFilter);

  const clearFilters = () => {
    setFranchiseFilter("");
  };

  const openCreateDialog = () => {
    setSelectedListing(null);
    setDialogOpen(true);
  };

  const openEditDialog = (listing: FigureSourceListing) => {
    setSelectedListing(listing);
    setDialogOpen(true);
  };

  const handleSubmit = async (payload: Record<string, string | number | boolean>) => {
    setSaving(true);

    const isEditing = Boolean(selectedListing?.id);
    const endpoint = isEditing
      ? `${FIGURE_SOURCE_LISTINGS_ENDPOINT}/${selectedListing?.id}`
      : FIGURE_SOURCE_LISTINGS_ENDPOINT;

    try {
      const response = await authFetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, "Error saving figure source listing."));
        return;
      }

      await fetchData(false);

      setDialogOpen(false);
      setSelectedListing(null);
    } catch (error) {
      console.error("Request error:", error);
      setApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!listingToDelete?.id) return;

    setDeleting(true);

    try {
      const response = await authFetch(`${FIGURE_SOURCE_LISTINGS_ENDPOINT}/${listingToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, "Error deleting figure source listing."));
        return;
      }

      await fetchData(false);
      setListingToDelete(null);
    } catch (error) {
      console.error("Request error:", error);
      setApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ApiErrorToast error={apiError} onClose={() => setApiError(null)} />

      <main className="container py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Figure Source Listings</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage source-specific marketplace listings for each figure.
            </p>
          </div>

          <Button type="button" className="gap-2 md:self-center" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            New Figure Source Listing
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-lg border bg-card p-4">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search source listings"
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
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {filteredListings.length} shown - {pageMeta.totalElements} total records
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {franchiseFilter && (
                <Badge variant="secondary" className="w-fit">
                  {franchisesById[Number(franchiseFilter)] || `Franchise ID ${franchiseFilter}`}
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

        <LoadingOverlay active={mutating} message="Updating source listings..." className="mt-4">
          <FigureSourceListingTable
            listings={filteredListings}
            loading={loading}
            figureImagesById={figureImagesById}
            onEdit={openEditDialog}
            onDelete={setListingToDelete}
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

      <FigureSourceListingFormDialog
        listing={selectedListing}
        figures={figures}
        sources={sources}
        open={dialogOpen}
        saving={saving}
        loadingOptions={loadingOptions || loadingReferenceData}
        currencyCodes={referenceData.currencyCodes.length > 0 ? referenceData.currencyCodes : fallbackCurrencyCodes}
        listingStatuses={
          referenceData.figureSourceListingStatuses.length > 0
            ? referenceData.figureSourceListingStatuses
            : fallbackListingStatuses
        }
        loadMethods={referenceData.loadMethods.length > 0 ? referenceData.loadMethods : fallbackLoadMethods}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={Boolean(listingToDelete)}
        onOpenChange={(open) => {
          if (!open) setListingToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete source listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete "{listingToDelete?.sourceTitle || "this listing"}" from the
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
    </div>
  );
};

export default FigureSourceListingPage;
