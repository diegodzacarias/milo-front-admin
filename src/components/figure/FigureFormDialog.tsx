import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import LoadingOverlay from "@/components/ui/loading-overlay";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authFetch } from "@/lib/apiClient";
import { ApiErrorResponse, readApiErrorResponse, toClientApiError } from "@/lib/apiError";
import { getPageContent, withPagination } from "@/lib/page";
import { cn } from "@/lib/utils";
import { ReferenceDataOption } from "@/types/referenceData";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://figure-market-core.onrender.com/api";

const CHARACTER_ENDPOINT = `${API_BASE_URL}/v1/characters`;
const CHARACTER_FORM_ENDPOINT = `${API_BASE_URL}/v1/character-forms`;
const FIGURE_CHARACTER_ENDPOINT = `${API_BASE_URL}/v1/figure-characters`;
const FIGURE_IMAGE_ENDPOINT = `${API_BASE_URL}/v1/figure-images`;

export type Figure = {
  id?: number;
  franchiseId?: number;
  franchise?: { id?: number; name?: string };
  brandId?: number;
  brand?: { id?: number; name?: string };
  name?: string;
  slug?: string;
  scene?: string | null;
  lineName?: string | null;
  material?: string | null;
  janCode?: string | null;
  officialProductCode?: string | null;
  sourceReferenceUrl?: string | null;
  primaryImageUrl?: string | null;
  isLicensed?: boolean;
  editionSize?: number | null;
  baseCurrencyCode?: string;
  status?: string;
  loadMethod?: string;
  notes?: string | null;
};

export type FranchiseOption = {
  id: number;
  name: string;
};

type CharacterOption = {
  id: number;
  label: string;
};

type CharacterFormOption = {
  id: number;
  label: string;
};

type FigureCharacter = {
  id?: number;
  figureId: number;
  figureName?: string;
  characterId: number;
  characterName?: string;
  characterJapaneseName?: string | null;
  characterFormId?: number | null;
  characterFormName?: string | null;
  primaryCharacter?: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

type FigureImage = {
  id?: number;
  figureId: number;
  figureName?: string;
  imageUrl: string;
  altText?: string | null;
  sortOrder?: number | null;
  primary?: boolean | null;
  sourceType?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BrandOption = {
  id: number;
  name: string;
};

export type FigureSortField =
  | "id"
  | "name"
  | "slug"
  | "franchiseId"
  | "brandId"
  | "janCode"
  | "officialProductCode"
  | "status"
  | "loadMethod";

export type FigureSort = {
  field: FigureSortField;
  direction: "asc" | "desc";
};

type FigureFormDialogProps = {
  figure: Figure | null;
  franchises: FranchiseOption[];
  brands: BrandOption[];
  currencyCodes: ReferenceDataOption[];
  figureStatuses: ReferenceDataOption[];
  open: boolean;
  saving: boolean;
  loadingOptions: boolean;
  slugError?: string;
  onOpenChange: (open: boolean) => void;
  onGenerateSlug: (name: string) => Promise<string>;
  onValidateSlug: (slug: string, figureId?: number) => Promise<boolean>;
  onSubmit: (payload: Record<string, string | number | boolean>) => Promise<void>;
  onApiError: (error: ApiErrorResponse) => void;
};

const getFigureFranchiseId = (figure: Figure | null) =>
  figure?.franchiseId || figure?.franchise?.id || "";

const getFigureBrandId = (figure: Figure | null) => figure?.brandId || figure?.brand?.id || "";

const FigureRelationCombobox = ({
  options,
  value,
  placeholder,
  disabled,
  nullable,
  onChange,
}: {
  options: Array<{ id: number; label: string }>;
  value: string;
  placeholder: string;
  disabled?: boolean;
  nullable?: boolean;
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.id.toString() === value);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="min-h-10 w-full justify-between whitespace-normal text-left font-normal"
        >
          <span className="line-clamp-2">
            {selectedOption ? selectedOption.label : nullable && !value ? "None" : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(42rem,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList
            className="max-h-80 overflow-y-auto"
            onWheelCapture={(event) => event.stopPropagation()}
            onTouchMoveCapture={(event) => event.stopPropagation()}
          >
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {nullable && (
                <CommandItem
                  value="none"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === "" ? "opacity-100" : "opacity-0")} />
                  None
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={`${option.label} ${option.id}`}
                  onSelect={() => {
                    onChange(option.id.toString());
                    setOpen(false);
                  }}
                  className="items-start gap-2 py-3"
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      value === option.id.toString() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="whitespace-normal leading-snug">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const FigureCharactersSection = ({
  figureId,
  onApiError,
}: {
  figureId?: number;
  onApiError: (error: ApiErrorResponse) => void;
}) => {
  const [rows, setRows] = useState<FigureCharacter[]>([]);
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [characterForms, setCharacterForms] = useState<CharacterFormOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [loadingForms, setLoadingForms] = useState(false);
  const [savingRelation, setSavingRelation] = useState(false);
  const [editing, setEditing] = useState<FigureCharacter | null>(null);
  const [rowToDelete, setRowToDelete] = useState<FigureCharacter | null>(null);
  const [localError, setLocalError] = useState("");
  const [form, setRelationForm] = useState({
    characterId: "",
    characterFormId: "",
    primaryCharacter: false,
    displayOrder: "0",
  });

  const busy = loading || savingRelation;

  const resetRelationForm = () => {
    setEditing(null);
    setLocalError("");
    setRelationForm({
      characterId: "",
      characterFormId: "",
      primaryCharacter: false,
      displayOrder: "0",
    });
    setCharacterForms([]);
  };

  const fetchFigureCharacters = async () => {
    if (!figureId) return;

    setLoading(true);

    try {
      const endpoint = `${FIGURE_CHARACTER_ENDPOINT}?figureId=${figureId}`;
      const response = await authFetch(withPagination(endpoint, 0, 100));

      if (!response.ok) {
        onApiError(await readApiErrorResponse(response, "Error loading figure characters."));
        return;
      }

      const data = await response.json();
      setRows(getPageContent<FigureCharacter>(data));
    } catch (error) {
      onApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setLoading(false);
    }
  };

  const fetchCharacters = async () => {
    setLoadingCharacters(true);

    try {
      const response = await authFetch(withPagination(CHARACTER_ENDPOINT, 0, 100, "canonicalName,asc"));

      if (!response.ok) {
        onApiError(await readApiErrorResponse(response, "Error loading characters."));
        return;
      }

      const data = await response.json();
      setCharacters(
        getPageContent<Record<string, string | number>>(data).map((item) => ({
          id: Number(item.id),
          label: String(item.canonicalName || item.characterName || item.name || item.id),
        }))
      );
    } catch (error) {
      onApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setLoadingCharacters(false);
    }
  };

  const fetchCharacterForms = async (characterId: string) => {
    if (!characterId) {
      setCharacterForms([]);
      return;
    }

    setLoadingForms(true);

    try {
      const endpoint = `${CHARACTER_FORM_ENDPOINT}?characterId=${characterId}`;
      const response = await authFetch(withPagination(endpoint, 0, 100, "canonicalName,asc"));

      if (!response.ok) {
        onApiError(await readApiErrorResponse(response, "Error loading character forms."));
        return;
      }

      const data = await response.json();
      setCharacterForms(
        getPageContent<Record<string, string | number>>(data).map((item) => ({
          id: Number(item.id),
          label: String(item.canonicalName || item.characterFormName || item.name || item.id),
        }))
      );
    } catch (error) {
      onApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setLoadingForms(false);
    }
  };

  useEffect(() => {
    if (!figureId) {
      setRows([]);
      resetRelationForm();
      return;
    }

    fetchFigureCharacters();
    fetchCharacters();
  }, [figureId]);

  useEffect(() => {
    fetchCharacterForms(form.characterId);
  }, [form.characterId]);

  const handleCharacterChange = (characterId: string) => {
    setLocalError("");
    setRelationForm((current) => ({
      ...current,
      characterId,
      characterFormId: "",
    }));
  };

  const handleEdit = (row: FigureCharacter) => {
    setLocalError("");
    setEditing(row);
    setRelationForm({
      characterId: row.characterId?.toString() || "",
      characterFormId: row.characterFormId?.toString() || "",
      primaryCharacter: Boolean(row.primaryCharacter),
      displayOrder: row.displayOrder?.toString() || "0",
    });
  };

  const handleSave = async () => {
    if (!figureId) return;

    setLocalError("");

    if (!form.characterId) {
      setLocalError("Character is required.");
      return;
    }

    if (form.displayOrder && Number(form.displayOrder) < 0) {
      setLocalError("Display Order must be 0 or greater.");
      return;
    }

    const characterId = Number(form.characterId);
    const characterFormId = form.characterFormId ? Number(form.characterFormId) : null;
    const duplicate = rows.some((row) => {
      const sameRecord = editing?.id && row.id === editing.id;
      return (
        !sameRecord &&
        row.characterId === characterId &&
        (row.characterFormId || null) === characterFormId
      );
    });

    if (duplicate) {
      setLocalError("This Figure + Character + Character Form combination already exists.");
      return;
    }

    const payload = {
      figureId,
      characterId,
      characterFormId,
      primaryCharacter: form.primaryCharacter,
      displayOrder: form.displayOrder ? Number(form.displayOrder) : 0,
    };

    setSavingRelation(true);

    try {
      const response = await authFetch(
        editing?.id ? `${FIGURE_CHARACTER_ENDPOINT}/${editing.id}` : FIGURE_CHARACTER_ENDPOINT,
        {
          method: editing?.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        onApiError(await readApiErrorResponse(response, "Error saving figure character."));
        return;
      }

      await fetchFigureCharacters();
      resetRelationForm();
    } catch (error) {
      onApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setSavingRelation(false);
    }
  };

  const handleDelete = async (row: FigureCharacter) => {
    if (!row.id) return;

    setSavingRelation(true);

    try {
      const response = await authFetch(`${FIGURE_CHARACTER_ENDPOINT}/${row.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        onApiError(await readApiErrorResponse(response, "Error deleting figure character."));
        return;
      }

      await fetchFigureCharacters();
      if (editing?.id === row.id) resetRelationForm();
      setRowToDelete(null);
    } catch (error) {
      onApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setSavingRelation(false);
    }
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-foreground">Figure Characters</h3>
        <p className="text-xs text-muted-foreground">
          Manage Character and optional Character Form relations through Figure Character records.
        </p>
      </div>

      {!figureId ? (
        <p className="mt-4 rounded-md border border-dashed bg-background p-4 text-sm text-muted-foreground">
          Save the Figure first to enable Figure Characters.
        </p>
      ) : (
        <LoadingOverlay active={busy} message="Updating figure characters..." className="mt-4">
          <div className="grid gap-4 rounded-md border bg-background p-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Character <span className="text-destructive">*</span>
              </label>
              <FigureRelationCombobox
                options={characters}
                value={form.characterId}
                placeholder={loadingCharacters ? "Loading characters..." : "Select Character"}
                disabled={loadingCharacters || savingRelation}
                onChange={handleCharacterChange}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Character Form</label>
              <FigureRelationCombobox
                options={characterForms}
                value={form.characterFormId}
                placeholder={loadingForms ? "Loading forms..." : "Select Character Form"}
                disabled={!form.characterId || loadingForms || savingRelation}
                nullable
                onChange={(value) =>
                  setRelationForm((current) => ({
                    ...current,
                    characterFormId: value,
                  }))
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Display Order</label>
              <Input
                type="number"
                min="0"
                value={form.displayOrder}
                disabled={savingRelation}
                onChange={(event) =>
                  setRelationForm((current) => ({
                    ...current,
                    displayOrder: event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex items-end justify-between gap-3">
              <label className="flex items-center gap-2 pb-2 text-sm font-medium text-foreground">
                <Checkbox
                  checked={form.primaryCharacter}
                  disabled={savingRelation}
                  onCheckedChange={(checked) =>
                    setRelationForm((current) => ({
                      ...current,
                      primaryCharacter: checked === true,
                    }))
                  }
                />
                Primary Character
              </label>

              <div className="flex gap-2">
                {editing && (
                  <Button type="button" variant="outline" disabled={savingRelation} onClick={resetRelationForm}>
                    Cancel
                  </Button>
                )}
                <Button type="button" className="gap-2" disabled={savingRelation} onClick={handleSave}>
                  {!editing && <Plus className="h-4 w-4" />}
                  {editing ? "Update" : "Add"}
                </Button>
              </div>
            </div>

            {localError && (
              <p className="md:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {localError}
              </p>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Character</TableHead>
                  <TableHead>Character Form</TableHead>
                  <TableHead>Primary Character</TableHead>
                  <TableHead>Display Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                      No Figure Characters found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div>{row.characterName || row.characterId}</div>
                        {row.characterJapaneseName && (
                          <div className="text-xs text-muted-foreground">{row.characterJapaneseName}</div>
                        )}
                      </TableCell>
                      <TableCell>{row.characterFormName || "-"}</TableCell>
                      <TableCell>{row.primaryCharacter ? "Yes" : "No"}</TableCell>
                      <TableCell>{row.displayOrder ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button type="button" size="sm" variant="outline" disabled={savingRelation} onClick={() => handleEdit(row)}>
                            Edit
                          </Button>
                          <Button type="button" size="sm" variant="destructive" disabled={savingRelation} onClick={() => setRowToDelete(row)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </LoadingOverlay>
      )}

      <AlertDialog
        open={Boolean(rowToDelete)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setRowToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Figure Character?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the relation for "{rowToDelete?.characterName || "this character"}".
              The Figure and Character records will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingRelation}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={savingRelation}
              onClick={() => {
                if (rowToDelete) handleDelete(rowToDelete);
              }}
            >
              {savingRelation ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const FigureImagesSection = ({
  figureId,
  onApiError,
}: {
  figureId?: number;
  onApiError: (error: ApiErrorResponse) => void;
}) => {
  const [rows, setRows] = useState<FigureImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [editing, setEditing] = useState<FigureImage | null>(null);
  const [rowToDelete, setRowToDelete] = useState<FigureImage | null>(null);
  const [localError, setLocalError] = useState("");
  const [form, setForm] = useState({
    imageUrl: "",
    altText: "",
    sortOrder: "",
    primary: false,
    sourceType: "",
  });

  const busy = loading || savingImage;

  const resetImageForm = () => {
    setEditing(null);
    setLocalError("");
    setForm({
      imageUrl: "",
      altText: "",
      sortOrder: "",
      primary: false,
      sourceType: "",
    });
  };

  const fetchFigureImages = async () => {
    if (!figureId) return;

    setLoading(true);

    try {
      const endpoint = `${FIGURE_IMAGE_ENDPOINT}?figureId=${figureId}`;
      const response = await authFetch(withPagination(endpoint, 0, 100, "sortOrder,asc"));

      if (!response.ok) {
        onApiError(await readApiErrorResponse(response, "Error loading figure images."));
        return;
      }

      const data = await response.json();
      setRows(getPageContent<FigureImage>(data));
    } catch (error) {
      onApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!figureId) {
      setRows([]);
      resetImageForm();
      return;
    }

    fetchFigureImages();
  }, [figureId]);

  const handleEdit = (row: FigureImage) => {
    setLocalError("");
    setEditing(row);
    setForm({
      imageUrl: row.imageUrl || "",
      altText: row.altText || "",
      sortOrder: row.sortOrder?.toString() || "",
      primary: row.primary === true,
      sourceType: row.sourceType || "",
    });
  };

  const buildPayload = (forcePrimary?: boolean) => {
    if (!figureId) return null;

    return {
      figureId,
      imageUrl: form.imageUrl.trim(),
      altText: form.altText.trim() || null,
      sortOrder: form.sortOrder ? Number(form.sortOrder) : null,
      primary: forcePrimary ?? form.primary,
      sourceType: form.sourceType.trim() || null,
    };
  };

  const handleSave = async () => {
    if (!figureId) return;

    setLocalError("");

    if (!form.imageUrl.trim()) {
      setLocalError("Image URL is required.");
      return;
    }

    if (form.sortOrder && Number(form.sortOrder) < 0) {
      setLocalError("Sort Order must be 0 or greater.");
      return;
    }

    const payload = buildPayload();
    if (!payload) return;

    setSavingImage(true);

    try {
      const response = await authFetch(
        editing?.id ? `${FIGURE_IMAGE_ENDPOINT}/${editing.id}` : FIGURE_IMAGE_ENDPOINT,
        {
          method: editing?.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        onApiError(await readApiErrorResponse(response, "Error saving figure image."));
        return;
      }

      await fetchFigureImages();
      resetImageForm();
    } catch (error) {
      onApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setSavingImage(false);
    }
  };

  const handleMarkPrimary = async (row: FigureImage) => {
    if (!figureId || !row.id) return;

    setSavingImage(true);

    try {
      const response = await authFetch(`${FIGURE_IMAGE_ENDPOINT}/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figureId,
          imageUrl: row.imageUrl,
          altText: row.altText || null,
          sortOrder: row.sortOrder ?? null,
          primary: true,
          sourceType: row.sourceType || null,
        }),
      });

      if (!response.ok) {
        onApiError(await readApiErrorResponse(response, "Error marking figure image as primary."));
        return;
      }

      await fetchFigureImages();
      if (editing?.id === row.id) {
        setForm((current) => ({ ...current, primary: true }));
      }
    } catch (error) {
      onApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setSavingImage(false);
    }
  };

  const handleDelete = async (row: FigureImage) => {
    if (!row.id) return;

    setSavingImage(true);

    try {
      const response = await authFetch(`${FIGURE_IMAGE_ENDPOINT}/${row.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        onApiError(await readApiErrorResponse(response, "Error deleting figure image."));
        return;
      }

      await fetchFigureImages();
      if (editing?.id === row.id) resetImageForm();
      setRowToDelete(null);
    } catch (error) {
      onApiError(toClientApiError(error, "Error connecting to backend."));
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-foreground">Figure Images</h3>
        <p className="text-xs text-muted-foreground">
          Manage optional image URLs and previews for this Figure.
        </p>
      </div>

      {!figureId ? (
        <p className="mt-4 rounded-md border border-dashed bg-background p-4 text-sm text-muted-foreground">
          Save the Figure first to enable Figure Images.
        </p>
      ) : (
        <LoadingOverlay active={busy} message="Updating figure images..." className="mt-4">
          <div className="grid gap-4 rounded-md border bg-background p-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-foreground">
                Image URL <span className="text-destructive">*</span>
              </label>
              <Input
                type="url"
                value={form.imageUrl}
                disabled={savingImage}
                onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Alt Text</label>
              <Input
                value={form.altText}
                disabled={savingImage}
                onChange={(event) => setForm((current) => ({ ...current, altText: event.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Source Type</label>
              <Input
                value={form.sourceType}
                disabled={savingImage}
                onChange={(event) => setForm((current) => ({ ...current, sourceType: event.target.value }))}
                placeholder="OFFICIAL, SOURCE, MANUAL..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Sort Order</label>
              <Input
                type="number"
                min="0"
                value={form.sortOrder}
                disabled={savingImage}
                onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
              />
            </div>

            <div className="flex items-end justify-between gap-3">
              <label className="flex items-center gap-2 pb-2 text-sm font-medium text-foreground">
                <Checkbox
                  checked={form.primary}
                  disabled={savingImage}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      primary: checked === true,
                    }))
                  }
                />
                Primary
              </label>

              <div className="flex gap-2">
                {editing && (
                  <Button type="button" variant="outline" disabled={savingImage} onClick={resetImageForm}>
                    Cancel
                  </Button>
                )}
                <Button type="button" className="gap-2" disabled={savingImage} onClick={handleSave}>
                  {!editing && <Plus className="h-4 w-4" />}
                  {editing ? "Update" : "Add"}
                </Button>
              </div>
            </div>

            {localError && (
              <p className="md:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {localError}
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            {rows.length === 0 ? (
              <p className="rounded-md border border-dashed bg-background p-4 text-sm text-muted-foreground">
                No Figure Images found.
              </p>
            ) : (
              rows.map((row) => (
                <div key={row.id} className="grid gap-4 rounded-md border bg-background p-3 md:grid-cols-[8rem_1fr_auto]">
                  <div className="aspect-square overflow-hidden rounded-md border bg-muted">
                    <img
                      src={row.imageUrl}
                      alt={row.altText || row.figureName || "Figure image"}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{row.altText || "Untitled image"}</p>
                      {row.primary && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{row.imageUrl}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Sort: {row.sortOrder ?? "-"}</span>
                      <span>Source: {row.sourceType || "-"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 md:flex-col md:items-stretch">
                    <Button type="button" size="sm" variant="outline" disabled={savingImage} onClick={() => handleEdit(row)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingImage || row.primary === true}
                      onClick={() => handleMarkPrimary(row)}
                    >
                      Set Primary
                    </Button>
                    <Button type="button" size="sm" variant="destructive" disabled={savingImage} onClick={() => setRowToDelete(row)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </LoadingOverlay>
      )}

      <AlertDialog
        open={Boolean(rowToDelete)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setRowToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Figure Image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this image URL from the Figure. The Figure record will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingImage}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={savingImage}
              onClick={() => {
                if (rowToDelete) handleDelete(rowToDelete);
              }}
            >
              {savingImage ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const FigureFormDialog = ({
  figure,
  franchises,
  brands,
  currencyCodes,
  figureStatuses,
  open,
  saving,
  loadingOptions,
  slugError,
  onOpenChange,
  onGenerateSlug,
  onValidateSlug,
  onSubmit,
  onApiError,
}: FigureFormDialogProps) => {
  const [slugEditable, setSlugEditable] = useState(false);
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [validatingSlug, setValidatingSlug] = useState(false);
  const [slugMessage, setSlugMessage] = useState("");
  const [form, setForm] = useState({
    franchiseId: "",
    brandId: "",
    name: "",
    slug: "",
    scene: "",
    lineName: "",
    material: "",
    janCode: "",
    officialProductCode: "",
    sourceReferenceUrl: "",
    isLicensed: "true",
    editionSize: "",
    baseCurrencyCode: "USD",
    status: "RELEASED",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;

    setForm({
      franchiseId: getFigureFranchiseId(figure).toString(),
      brandId: getFigureBrandId(figure).toString(),
      name: figure?.name || "",
      slug: figure?.slug || "",
      scene: figure?.scene || "",
      lineName: figure?.lineName || "",
      material: figure?.material || "",
      janCode: figure?.janCode || "",
      officialProductCode: figure?.officialProductCode || "",
      sourceReferenceUrl: figure?.sourceReferenceUrl || "",
      isLicensed: (figure?.isLicensed ?? true).toString(),
      editionSize: figure?.editionSize?.toString() || "",
      baseCurrencyCode: figure?.baseCurrencyCode || "USD",
      status: figure?.status || "RELEASED",
      notes: figure?.notes || "",
    });
    setSlugEditable(false);
    setSlugMessage("");
  }, [figure, open]);

  useEffect(() => {
    if (slugError) setSlugMessage(slugError);
  }, [slugError]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSlugMessage("");

    if (!form.slug.trim()) {
      setSlugMessage("Generate a slug before saving, or unlock the field and enter one.");
      return;
    }

    setValidatingSlug(true);

    try {
      const slugAvailable = await onValidateSlug(form.slug.trim(), figure?.id);

      if (!slugAvailable) {
        setSlugMessage("This slug is already in use. Edit it or generate another one.");
        return;
      }
    } catch {
      return;
    } finally {
      setValidatingSlug(false);
    }

    const payload: Record<string, string | number | boolean> = {
      franchiseId: Number(form.franchiseId),
      brandId: Number(form.brandId),
      name: form.name.trim(),
      slug: form.slug.trim(),
      isLicensed: form.isLicensed === "true",
      baseCurrencyCode: form.baseCurrencyCode,
      status: form.status,
    };

    if (form.scene.trim()) payload.scene = form.scene.trim();
    if (form.lineName.trim()) payload.lineName = form.lineName.trim();
    if (form.material.trim()) payload.material = form.material.trim();
    if (form.janCode.trim()) payload.janCode = form.janCode.trim();
    if (form.officialProductCode.trim()) payload.officialProductCode = form.officialProductCode.trim();
    if (form.sourceReferenceUrl.trim()) payload.sourceReferenceUrl = form.sourceReferenceUrl.trim();
    if (form.editionSize) payload.editionSize = Number(form.editionSize);
    if (form.notes.trim()) payload.notes = form.notes.trim();

    await onSubmit(payload);
  };

  const handleGenerateSlug = async () => {
    const name = form.name.trim();

    if (!name) {
      setSlugMessage("Write a name before generating the slug.");
      return;
    }

    setSlugMessage("");
    setGeneratingSlug(true);

    try {
      const slug = await onGenerateSlug(name);
      setForm((prev) => ({ ...prev, slug }));
      setSlugEditable(false);
      setSlugMessage("Slug generated and available.");
    } finally {
      setGeneratingSlug(false);
    }
  };

  const selectClass =
    "w-full border border-input bg-background text-foreground p-2 rounded";
  const optionClass = "bg-background text-foreground";
  const helperClass = "mt-1 text-xs text-muted-foreground";
  const labelClass = "mb-1 block text-sm font-medium text-foreground";
  const requiredMark = <span className="text-destructive">*</span>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <LoadingOverlay active={saving} label="Saving figure..." />

        <DialogHeader>
          <DialogTitle>{figure ? "Update Figure" : "New Figure"}</DialogTitle>
          <DialogDescription>
            Manage the main figure record used by aliases and source listings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Franchise {requiredMark}</label>
              <select
                name="franchiseId"
                value={form.franchiseId}
                onChange={handleChange}
                className={selectClass}
                disabled={loadingOptions || franchises.length === 0}
                required
              >
                <option className={optionClass} value="">
                  {loadingOptions ? "Loading franchises..." : "Select a franchise"}
                </option>
                {franchises.map((franchise) => (
                  <option className={optionClass} key={franchise.id} value={franchise.id}>
                    {franchise.name}
                  </option>
                ))}
              </select>
              <p className={helperClass}>Anime o universo al que pertenece la figura.</p>
            </div>

            <div>
              <label className={labelClass}>Brand {requiredMark}</label>
              <select
                name="brandId"
                value={form.brandId}
                onChange={handleChange}
                className={selectClass}
                required
              >
                <option className={optionClass} value="">Select a brand</option>
                {brands.map((brand) => (
                  <option className={optionClass} key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <p className={helperClass}>Fabricante o marca que produce la figura.</p>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Name {requiredMark}</label>
              <Input name="name" maxLength={255} value={form.name} onChange={handleChange} required />
              <p className={helperClass}>Nombre completo del producto.</p>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Slug {requiredMark}</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  name="slug"
                  maxLength={300}
                  value={form.slug}
                  onChange={(event) => {
                    handleChange(event);
                    setSlugMessage("");
                  }}
                  disabled={!slugEditable}
                  required
                  className="sm:flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={generatingSlug || !form.name.trim()}
                  onClick={handleGenerateSlug}
                >
                  {generatingSlug ? "Generating..." : "Generate"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSlugEditable((current) => !current)}>
                  {slugEditable ? "Lock" : "Edit"}
                </Button>
              </div>
              <p className={helperClass}>
                {slugMessage || "Generate it from the name, or unlock it if manual editing is needed."}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Scene</label>
              <Input name="scene" maxLength={255} value={form.scene} onChange={handleChange} />
              <p className={helperClass}>Pose, escena o transformacion representada.</p>
            </div>

            <div>
              <label className={labelClass}>Line Name</label>
              <Input name="lineName" maxLength={150} value={form.lineName} onChange={handleChange} />
              <p className={helperClass}>Linea o coleccion comercial de la marca.</p>
            </div>

            <div>
              <label className={labelClass}>Material</label>
              <Input name="material" maxLength={100} value={form.material} onChange={handleChange} />
              <p className={helperClass}>Material principal, como PVC, ABS o resina.</p>
            </div>

            <div>
              <label className={labelClass}>JAN/EAN Code</label>
              <Input name="janCode" maxLength={20} value={form.janCode} onChange={handleChange} />
              <p className={helperClass}>Codigo JAN/EAN canonico usado para matching y verificacion.</p>
            </div>

            <div>
              <label className={labelClass}>Official Product Code</label>
              <Input
                name="officialProductCode"
                maxLength={100}
                value={form.officialProductCode}
                onChange={handleChange}
              />
              <p className={helperClass}>Codigo oficial publicado por el fabricante o marca.</p>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Source Reference URL</label>
              <Input
                name="sourceReferenceUrl"
                type="url"
                maxLength={1000}
                value={form.sourceReferenceUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
              <p className={helperClass}>
                URL de referencia canonica usada para verificar la informacion principal de la figura.
              </p>
            </div>

            <div>
              <label className={labelClass}>Edition Size</label>
              <Input
                name="editionSize"
                type="number"
                min="0"
                value={form.editionSize}
                onChange={handleChange}
              />
              <p className={helperClass}>Cantidad producida si es una edicion limitada.</p>
            </div>

            <div>
              <label className={labelClass}>Licensed {requiredMark}</label>
              <select
                name="isLicensed"
                value={form.isLicensed}
                onChange={handleChange}
                className={selectClass}
                required
              >
                <option className={optionClass} value="true">Yes</option>
                <option className={optionClass} value="false">No</option>
              </select>
              <p className={helperClass}>Indica si es una figura oficial/licenciada.</p>
            </div>

            <div>
              <label className={labelClass}>Status {requiredMark}</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className={selectClass}
                required
              >
                {figureStatuses.map((status) => (
                  <option className={optionClass} key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <p className={helperClass}>Disponibilidad actual: preventa, lanzada o agotada.</p>
            </div>

            <div>
              <label className={labelClass}>Base Currency {requiredMark}</label>
              <select
                name="baseCurrencyCode"
                value={form.baseCurrencyCode}
                onChange={handleChange}
                className={selectClass}
                required
              >
                {currencyCodes.map((currency) => (
                  <option className={optionClass} key={currency.value} value={currency.value}>
                    {currency.label}{currency.symbol ? ` (${currency.symbol})` : ""}
                  </option>
                ))}
              </select>
              <p className={helperClass}>Moneda base requerida por el backend.</p>
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full rounded border border-input bg-background p-3 text-foreground"
            />
            <p className={helperClass}>Datos adicionales, variantes u observaciones internas.</p>
          </div>

          <FigureCharactersSection figureId={figure?.id} onApiError={onApiError} />
          <FigureImagesSection figureId={figure?.id} onApiError={onApiError} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || validatingSlug}>
              {saving ? "Saving..." : validatingSlug ? "Validating slug..." : figure ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FigureFormDialog;
