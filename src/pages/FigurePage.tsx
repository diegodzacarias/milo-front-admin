import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import {
  physicallyDeleteFigure,
  type FigurePhysicalDeleteResponse,
} from "@/api/figureApi";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ApiErrorToast from "@/components/ui/api-error-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import LoadingOverlay from "@/components/ui/loading-overlay";
import PageControls from "@/components/ui/page-controls";
import FigureTable from "@/components/figure/FigureTable";
import type {
  BrandOption,
  Figure,
  FigureSort,
  FigureSortField,
  FranchiseOption,
} from "@/components/figure/FigureFormDialog";
import type { SourceOption } from "@/components/figureAlias/FigureAliasFormDialog";
import { useReferenceData } from "@/hooks/useReferenceData";
import { authFetch } from "@/lib/apiClient";
import { ApiErrorResponse, normalizeApiError, readApiErrorResponse, toClientApiError } from "@/lib/apiError";
import { defaultPageMeta, getPageContent, getPageMeta, withPageSize } from "@/lib/page";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://figure-market-core.onrender.com/api";

const FIGURES_ENDPOINT = `${API_BASE_URL}/v1/figures`;
const FIGURE_SEARCH_ENDPOINT = `${FIGURES_ENDPOINT}/search`;
const FIGURE_SLUG_SUGGESTION_ENDPOINT = `${FIGURES_ENDPOINT}/slug/suggestion`;
const FIGURE_SLUG_AVAILABILITY_ENDPOINT = `${FIGURES_ENDPOINT}/slug/availability`;
const FRANCHISES_ENDPOINT = `${API_BASE_URL}/v1/franchises`;
const SOURCES_ENDPOINT = `${API_BASE_URL}/v1/sources`;
const BRANDS_ENDPOINT = `${API_BASE_URL}/v1/brands`;

const FigureFormDialog = lazy(() => import("@/components/figure/FigureFormDialog"));

// Fallback mientras el backend no exponga GET /v1/brands (ver BRANDS_ENDPOINT).
// TODO: eliminar este hardcodeo una vez el endpoint este disponible.
const fallbackBrands: BrandOption[] = [
  { id: 1, name: "Good Smile Company" },
  { id: 2, name: "Kotobukiya" },
  { id: 3, name: "MegaHouse" },
  { id: 4, name: "Prime 1 Studio" },
  { id: 5, name: "Tsume Art" },
  { id: 6, name: "Gecco" },
  { id: 7, name: "Oniri Créations" },
];

const fallbackCurrencyCodes = [
  { value: "USD", label: "Usd", symbol: "$" },
  { value: "JPY", label: "Jpy", symbol: "¥" },
];

const fallbackFigureStatuses = [
  { value: "PREORDER", label: "Preorder" },
  { value: "RELEASED", label: "Released" },
  { value: "SOLD_OUT", label: "Sold Out" },
];

type FigureSearchFilters = {
  franchiseId: string;
  brandId: string;
  status: string;
  baseCurrencyCode: string;
  isLicensed: string;
};

const buildFigureSearchUrl = (
  page: number,
  size: number,
  query: string,
  filters: FigureSearchFilters,
  sort: FigureSort
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
    sort: `${sort.field},${sort.direction}`,
  });

  if (query.trim()) {
    params.set("q", query.trim());
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  return `${FIGURE_SEARCH_ENDPOINT}?${params.toString()}`;
};

const FigurePage = () => {
  const [figures, setFigures] = useState<Figure[]>([]);
  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>(fallbackBrands);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [physicalDeleting, setPhysicalDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FigureSearchFilters>({
    franchiseId: "",
    brandId: "",
    status: "",
    baseCurrencyCode: "",
    isLicensed: "",
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<FigureSort>({ field: "name", direction: "asc" });
  const [pageMeta, setPageMeta] = useState(defaultPageMeta);
  const [apiError, setApiError] = useState<ApiErrorResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);
  const [figureToDelete, setFigureToDelete] = useState<Figure | null>(null);
  const [figureToPhysicalDelete, setFigureToPhysicalDelete] = useState<Figure | null>(null);
  const [physicalDeleteConfirmation, setPhysicalDeleteConfirmation] = useState("");
  const [physicalDeleteResult, setPhysicalDeleteResult] = useState<FigurePhysicalDeleteResponse | null>(null);
  const [figureSlugError, setFigureSlugError] = useState("");
  const [sourceLinksOpen, setSourceLinksOpen] = useState(false);
  const mutating = saving || deleting || physicalDeleting;
  const { referenceData } = useReferenceData();

  const fetchData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setLoadingOptions(true);
    }

    try {
      const [figuresResponse, franchisesResponse, sourcesResponse, brandsResponse] = await Promise.all([
        authFetch(buildFigureSearchUrl(page, pageSize, search, filters, sort)),
        authFetch(withPageSize(FRANCHISES_ENDPOINT)),
        authFetch(withPageSize(SOURCES_ENDPOINT)),
        authFetch(withPageSize(BRANDS_ENDPOINT)),
      ]);

      if (figuresResponse.ok) {
        const data = await figuresResponse.json();
        setFigures(getPageContent<Figure>(data));
        setPageMeta(getPageMeta<Figure>(data, pageSize));
      } else {
        console.error("Error fetching figures");
      }

      if (franchisesResponse.ok) {
        const data = await franchisesResponse.json();
        setFranchises(getPageContent<FranchiseOption>(data));
      } else {
        console.error("Error fetching franchises");
      }

      if (sourcesResponse.ok) {
        const data = await sourcesResponse.json();
        setSources(getPageContent<SourceOption>(data));
      } else {
        console.error("Error fetching sources");
      }

      if (brandsResponse.ok) {
        const data = await brandsResponse.json();
        const content = getPageContent<BrandOption>(data);
        if (content.length > 0) setBrands(content);
      } else {
        // Backend aun no expone /v1/brands: seguimos con fallbackBrands.
        console.error("Error fetching brands");
      }
    } catch (error) {
      console.error("Request error fetching figures:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
        setLoadingOptions(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, search, filters, sort]);

  const handleSort = (field: FigureSortField) => {
    setSort((current) =>
      current.field === field
        ? { field, direction: current.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "asc" }
    );
    setPage(0);
  };

  const franchiseNames = useMemo(
    () => Object.fromEntries(franchises.map((franchise) => [franchise.id, franchise.name])),
    [franchises]
  );

  const brandNames = useMemo(
    () => Object.fromEntries(brands.map((brand) => [brand.id, brand.name])),
    [brands]
  );

  const filteredFigures = figures;

  const updateFilter = (key: keyof FigureSearchFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  };

  const openCreateDialog = () => {
    setSelectedFigure(null);
    setFigureSlugError("");
    setDialogOpen(true);
  };

  const openEditDialog = (figure: Figure) => {
    setSelectedFigure(figure);
    setFigureSlugError("");
    setDialogOpen(true);
  };

  const generateSlug = async (name: string) => {
    const response = await authFetch(
      `${FIGURE_SLUG_SUGGESTION_ENDPOINT}?title=${encodeURIComponent(name)}`
    );

    if (!response.ok) {
      setApiError(await readApiErrorResponse(response, "Error generating slug."));
      throw new Error("Error generating slug");
    }

    const data = await response.json();
    return data.slug || "";
  };

  const validateSlug = async (slug: string, figureId?: number) => {
    const params = new URLSearchParams({ slug });

    if (figureId) {
      params.set("excludeFigureId", figureId.toString());
    }

    const response = await authFetch(`${FIGURE_SLUG_AVAILABILITY_ENDPOINT}?${params.toString()}`);

    if (!response.ok) {
      setApiError(await readApiErrorResponse(response, "Error validating slug."));
      throw new Error("Error validating slug");
    }

    const data = await response.json();
    return Boolean(data.available);
  };

  const handleSubmit = async (payload: Record<string, string | number | boolean>) => {
    setSaving(true);

    const isEditing = Boolean(selectedFigure?.id);
    const endpoint = isEditing ? `${FIGURES_ENDPOINT}/${selectedFigure?.id}` : FIGURES_ENDPOINT;

    try {
      const response = await authFetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, "Error saving figure."));
        if (response.status === 409) setFigureSlugError("Este slug ya está en uso");
        return;
      }

      const savedFigure = await response.json();
      await fetchData(false);

      if (isEditing) {
        setDialogOpen(false);
        setSelectedFigure(null);
      } else {
        setSelectedFigure(savedFigure);
      }
    } catch (error) {
      console.error("Request error:", error);
      setApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!figureToDelete?.id) return;

    setDeleting(true);

    try {
      const response = await authFetch(`${FIGURES_ENDPOINT}/${figureToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, "Error deleting figure."));
        return;
      }

      await fetchData(false);
      setFigureToDelete(null);
    } catch (error) {
      console.error("Request error:", error);
      setApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setDeleting(false);
    }
  };

  const handlePhysicalDelete = async () => {
    if (!figureToPhysicalDelete?.id) return;

    setPhysicalDeleting(true);

    try {
      const result = await physicallyDeleteFigure(figureToPhysicalDelete.id);
      await fetchData(false);
      setPhysicalDeleteResult(result);
      setFigureToPhysicalDelete(null);
      setPhysicalDeleteConfirmation("");
    } catch (error) {
      setApiError(normalizeApiError(error, "Error physically deleting figure."));
    } finally {
      setPhysicalDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ApiErrorToast error={apiError} onClose={() => setApiError(null)} />
      <LoadingOverlay active={physicalDeleting} fullscreen message="Physically deleting figure and related records..." />

      <main className="container py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Figures</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage figure records used by aliases, listings, and marketplace views.
            </p>
          </div>

          <Button type="button" className="gap-2 md:self-center" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            New Figure
          </Button>
        </div>

        <Collapsible
          open={sourceLinksOpen}
          onOpenChange={setSourceLinksOpen}
          className="mt-6 rounded-lg border bg-muted/30 p-4"
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
            <h2 className="text-sm font-medium text-foreground">Source quick links</h2>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${sourceLinksOpen ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 flex flex-wrap gap-2">
              {sources.filter((source) => source.baseUrl).length === 0 ? (
                <p className="text-sm text-muted-foreground">No source URLs available.</p>
              ) : (
                sources
                  .filter((source) => source.baseUrl)
                  .map((source) => (
                    <a
                      key={source.id}
                      href={source.baseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      {source.name}
                    </a>
                  ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="sticky top-20 z-40 mt-6 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search figures"
                className="pl-9"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              {filteredFigures.length} shown - {pageMeta.totalElements} total records
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <select
              value={filters.franchiseId}
              onChange={(event) => updateFilter("franchiseId", event.target.value)}
              className="rounded border border-input bg-background p-2 text-sm text-foreground"
            >
              <option value="">All franchises</option>
              {franchises.map((franchise) => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.name}
                </option>
              ))}
            </select>

            <select
              value={filters.brandId}
              onChange={(event) => updateFilter("brandId", event.target.value)}
              className="rounded border border-input bg-background p-2 text-sm text-foreground"
            >
              <option value="">All brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
              className="rounded border border-input bg-background p-2 text-sm text-foreground"
            >
              <option value="">All statuses</option>
              {(referenceData.figureStatuses.length > 0 ? referenceData.figureStatuses : fallbackFigureStatuses).map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={filters.baseCurrencyCode}
              onChange={(event) => updateFilter("baseCurrencyCode", event.target.value)}
              className="rounded border border-input bg-background p-2 text-sm text-foreground"
            >
              <option value="">All currencies</option>
              {(referenceData.currencyCodes.length > 0 ? referenceData.currencyCodes : fallbackCurrencyCodes).map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>

            <select
              value={filters.isLicensed}
              onChange={(event) => updateFilter("isLicensed", event.target.value)}
              className="rounded border border-input bg-background p-2 text-sm text-foreground"
            >
              <option value="">All license states</option>
              <option value="true">Licensed</option>
              <option value="false">Unlicensed</option>
            </select>
          </div>
        </div>

        <LoadingOverlay active={mutating} message="Updating figures..." className="mt-4">
          <FigureTable
            figures={filteredFigures}
            loading={loading}
            franchiseNames={franchiseNames}
            brandNames={brandNames}
            sort={sort}
            onSort={handleSort}
            onEdit={openEditDialog}
            onDelete={setFigureToDelete}
            onPhysicalDelete={(figure) => {
              setFigureToPhysicalDelete(figure);
              setPhysicalDeleteConfirmation("");
            }}
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

      {dialogOpen && (
        <Suspense fallback={null}>
          <FigureFormDialog
            figure={selectedFigure}
            franchises={franchises}
            brands={brands}
            open={dialogOpen}
            saving={saving}
            loadingOptions={loadingOptions}
            currencyCodes={referenceData.currencyCodes.length > 0 ? referenceData.currencyCodes : fallbackCurrencyCodes}
            figureStatuses={referenceData.figureStatuses.length > 0 ? referenceData.figureStatuses : fallbackFigureStatuses}
            onOpenChange={setDialogOpen}
            onGenerateSlug={generateSlug}
            onValidateSlug={validateSlug}
            slugError={figureSlugError}
            onApiError={setApiError}
            onSubmit={handleSubmit}
          />
        </Suspense>
      )}

      <AlertDialog
        open={Boolean(figureToDelete)}
        onOpenChange={(open) => {
          if (!open) setFigureToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete figure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete "{figureToDelete?.name || "this figure"}" from the database.
              This cannot be undone.
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

      <Dialog
        open={Boolean(figureToPhysicalDelete)}
        onOpenChange={(open) => {
          if (!open && !physicalDeleting) {
            setFigureToPhysicalDelete(null);
            setPhysicalDeleteConfirmation("");
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">Borrado fisico permanente</DialogTitle>
            <DialogDescription>
              You are about to physically delete "{figureToPhysicalDelete?.name || "this figure"}"
              (ID {figureToPhysicalDelete?.id}). This removes its character relations, aliases, images,
              source listings, scraped candidates, market sales, metrics, and scraping history references.
              This operation cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4">
            <label className="text-sm font-medium text-foreground" htmlFor="physical-delete-confirmation">
              Type <span className="font-mono text-destructive">DELETE {figureToPhysicalDelete?.id}</span> to confirm
            </label>
            <Input
              id="physical-delete-confirmation"
              className="mt-2 font-mono"
              value={physicalDeleteConfirmation}
              disabled={physicalDeleting}
              autoComplete="off"
              onChange={(event) => setPhysicalDeleteConfirmation(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={physicalDeleting}
              onClick={() => {
                setFigureToPhysicalDelete(null);
                setPhysicalDeleteConfirmation("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                physicalDeleting ||
                physicalDeleteConfirmation !== `DELETE ${figureToPhysicalDelete?.id}`
              }
              onClick={handlePhysicalDelete}
            >
              {physicalDeleting ? "Deleting permanently..." : "Physically delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(physicalDeleteResult)} onOpenChange={(open) => !open && setPhysicalDeleteResult(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Physical deletion completed</DialogTitle>
            <DialogDescription>
              Figure ID {physicalDeleteResult?.figureId} was physically deleted. The backend reported the following cleanup.
            </DialogDescription>
          </DialogHeader>

          {physicalDeleteResult && (
            <dl className="grid gap-2 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
              {[
                ["Scraped candidates", physicalDeleteResult.scrapedListingCandidatesDeleted],
                ["Market sales", physicalDeleteResult.marketSalesDeleted],
                ["Metric snapshots", physicalDeleteResult.metricSnapshotsDeleted],
                ["Source listings", physicalDeleteResult.sourceListingsDeleted],
                ["Aliases", physicalDeleteResult.aliasesDeleted],
                ["Images", physicalDeleteResult.imagesDeleted],
                ["Character relations", physicalDeleteResult.characterRelationsDeleted],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-md bg-background px-3 py-2">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <DialogFooter>
            <Button type="button" onClick={() => setPhysicalDeleteResult(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FigurePage;
