import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import LoadingOverlay from "@/components/ui/loading-overlay";
import PageControls from "@/components/ui/page-controls";
import SourceFormDialog, { Source, SourcePayload } from "@/components/source/SourceFormDialog";
import SourceTable from "@/components/source/SourceTable";
import { useReferenceData } from "@/hooks/useReferenceData";
import { authFetch } from "@/lib/apiClient";
import { ApiErrorResponse, readApiErrorResponse, toClientApiError } from "@/lib/apiError";
import { defaultPageMeta, getPageContent, getPageMeta, withPagination } from "@/lib/page";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://figure-market-core.onrender.com/api";

const SOURCES_ENDPOINT = `${API_BASE_URL}/v1/sources`;

const fallbackSourceTypes = [
  { value: "OFFICIAL", label: "Official" },
  { value: "RETAILER", label: "Retailer" },
  { value: "MARKETPLACE", label: "Marketplace" },
];

const fallbackSourcePriorities = [
  { value: "OFFICIAL", label: "Official", level: 100 },
  { value: "HIGH", label: "High", level: 80 },
  { value: "MEDIUM", label: "Medium", level: 50 },
  { value: "LOW", label: "Low", level: 30 },
  { value: "UNRELIABLE", label: "Unreliable", level: 10 },
];

const fallbackBrandSegments = [
  { value: "PREMIUM_STATUE", label: "Premium Statue" },
  { value: "MID_SCALE", label: "Mid Scale" },
  { value: "MASS_PVC", label: "Mass Pvc" },
  { value: "PRIZE", label: "Prize" },
];

const SourcePage = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [pageMeta, setPageMeta] = useState(defaultPageMeta);
  const [apiError, setApiError] = useState<ApiErrorResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<Source | null>(null);
  const [sourceNameError, setSourceNameError] = useState("");
  const mutating = saving || deleting;
  const { referenceData } = useReferenceData();

  const fetchSources = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const response = await authFetch(withPagination(SOURCES_ENDPOINT, page, pageSize));

      if (!response.ok) {
        console.error("Error fetching sources");
        return;
      }

      const data = await response.json();
      setSources(getPageContent<Source>(data));
      setPageMeta(getPageMeta<Source>(data, pageSize));
    } catch (error) {
      console.error("Request error fetching sources:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [page, pageSize]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const filteredSources = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return sources;

    return sources.filter((source) =>
      [source.id?.toString(), source.name, source.baseUrl, source.type, source.priority?.toString()]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [search, sources]);

  const openCreateDialog = () => {
    setSelectedSource(null);
    setSourceNameError("");
    setDialogOpen(true);
  };

  const openEditDialog = (source: Source) => {
    setSelectedSource(source);
    setSourceNameError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (payload: SourcePayload) => {
    setSaving(true);

    const isEditing = Boolean(selectedSource?.id);
    const endpoint = isEditing ? `${SOURCES_ENDPOINT}/${selectedSource?.id}` : SOURCES_ENDPOINT;

    try {
      const response = await authFetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, "Error saving source."));
        if (response.status === 409) setSourceNameError("Este nombre ya está en uso");
        return;
      }

      await fetchSources(false);

      setDialogOpen(false);
      setSelectedSource(null);
    } catch (error) {
      console.error("Request error:", error);
      setApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sourceToDelete?.id) return;

    setDeleting(true);

    try {
      const response = await authFetch(`${SOURCES_ENDPOINT}/${sourceToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, "Error deleting source."));
        return;
      }

      await fetchSources(false);
      setSourceToDelete(null);
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
            <h1 className="text-3xl font-bold text-foreground">Sources</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage source records used by aliases and source listings.
            </p>
          </div>

          <Button type="button" className="gap-2 md:self-center" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            New Source
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sources"
              className="pl-9"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {filteredSources.length} shown - {pageMeta.totalElements} total records
          </p>
        </div>

        <LoadingOverlay active={mutating} message="Updating sources..." className="mt-4">
          <SourceTable
            sources={filteredSources}
            loading={loading}
            onEdit={openEditDialog}
            onDelete={setSourceToDelete}
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

      <SourceFormDialog
        source={selectedSource}
        sourceTypes={referenceData.sourceTypes.length > 0 ? referenceData.sourceTypes : fallbackSourceTypes}
        sourcePriorities={
          referenceData.sourcePriorities.length > 0
            ? referenceData.sourcePriorities
            : fallbackSourcePriorities
        }
        brandSegments={
          referenceData.brandSegments.length > 0
            ? referenceData.brandSegments
            : fallbackBrandSegments
        }
        open={dialogOpen}
        saving={saving}
        nameError={sourceNameError}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={Boolean(sourceToDelete)}
        onOpenChange={(open) => {
          if (!open) setSourceToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete source?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete "{sourceToDelete?.name || "this source"}" from the database.
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
    </div>
  );
};

export default SourcePage;
