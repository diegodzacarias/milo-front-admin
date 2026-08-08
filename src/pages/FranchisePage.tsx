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
import FranchiseFormDialog, { Franchise } from "@/components/franchise/FranchiseFormDialog";
import FranchiseTable from "@/components/franchise/FranchiseTable";
import { authFetch } from "@/lib/apiClient";
import { ApiErrorResponse, readApiErrorResponse, toClientApiError } from "@/lib/apiError";
import { defaultPageMeta, getPageContent, getPageMeta, withPagination } from "@/lib/page";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://figure-market-core.onrender.com/api";

const FRANCHISES_ENDPOINT = `${API_BASE_URL}/v1/franchises`;

const FranchisePage = () => {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [pageMeta, setPageMeta] = useState(defaultPageMeta);
  const [apiError, setApiError] = useState<ApiErrorResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFranchise, setSelectedFranchise] = useState<Franchise | null>(null);
  const [franchiseToDelete, setFranchiseToDelete] = useState<Franchise | null>(null);
  const mutating = saving || deleting;

  const fetchFranchises = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const response = await authFetch(withPagination(FRANCHISES_ENDPOINT, page, pageSize));

      if (!response.ok) {
        console.error("Error fetching franchises");
        return;
      }

      const data = await response.json();
      setFranchises(getPageContent<Franchise>(data));
      setPageMeta(getPageMeta<Franchise>(data, pageSize));
    } catch (error) {
      console.error("Request error fetching franchises:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchFranchises();
  }, [page, pageSize]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const filteredFranchises = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return franchises;

    return franchises.filter((franchise) =>
      [franchise.id?.toString(), franchise.name, franchise.slug, franchise.imageUrl]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [franchises, search]);

  const openCreateDialog = () => {
    setSelectedFranchise(null);
    setDialogOpen(true);
  };

  const openEditDialog = (franchise: Franchise) => {
    setSelectedFranchise(franchise);
    setDialogOpen(true);
  };

  const handleSubmit = async (payload: Franchise) => {
    setSaving(true);

    const isEditing = Boolean(selectedFranchise?.id);
    const endpoint = isEditing
      ? `${FRANCHISES_ENDPOINT}/${selectedFranchise?.id}`
      : FRANCHISES_ENDPOINT;

    try {
      const response = await authFetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, "Error saving franchise."));
        return;
      }

      await fetchFranchises(false);

      setDialogOpen(false);
      setSelectedFranchise(null);
    } catch (error) {
      console.error("Request error:", error);
      setApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!franchiseToDelete?.id) return;

    setDeleting(true);

    try {
      const response = await authFetch(`${FRANCHISES_ENDPOINT}/${franchiseToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, "Error deleting franchise."));
        return;
      }

      await fetchFranchises(false);
      setFranchiseToDelete(null);
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
            <h1 className="text-3xl font-bold text-foreground">Franchises</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage franchise records used by figures and marketplace views.
            </p>
          </div>

          <Button type="button" className="gap-2 md:self-center" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            New Franchise
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by id, name, slug or image URL"
              className="pl-9"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {filteredFranchises.length} shown - {pageMeta.totalElements} total records
          </p>
        </div>

        <LoadingOverlay active={mutating} message="Updating franchises..." className="mt-4">
          <FranchiseTable
            franchises={filteredFranchises}
            loading={loading}
            onEdit={openEditDialog}
            onDelete={setFranchiseToDelete}
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

      <FranchiseFormDialog
        franchise={selectedFranchise}
        open={dialogOpen}
        saving={saving}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={Boolean(franchiseToDelete)}
        onOpenChange={(open) => {
          if (!open) setFranchiseToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete franchise?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete "{franchiseToDelete?.name || "this franchise"}" from the
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

export default FranchisePage;
