import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import ApiErrorToast from "@/components/ui/api-error-toast";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import LoadingOverlay from "@/components/ui/loading-overlay";
import PageControls from "@/components/ui/page-controls";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authFetch } from "@/lib/apiClient";
import { ApiErrorResponse, readApiErrorResponse, toClientApiError } from "@/lib/apiError";
import { defaultPageMeta, getPageContent, getPageMeta, withPageSize, withPagination } from "@/lib/page";
import { cn } from "@/lib/utils";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://figure-market-core.onrender.com/api";

type EntityRecord = Record<string, string | number | boolean | null | undefined>;

type SelectOption = {
  id: number;
  label: string;
};

type FieldConfig = {
  name: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  required?: boolean;
  nullable?: boolean;
  maxLength?: number;
  defaultValue?: string;
  helper: string;
  optionsKey?: keyof OptionState;
  staticOptions?: SelectOption[];
  lockedDerivedFrom?: string;
  deriveValue?: (value: string) => string;
  fullWidth?: boolean;
};

type RelatedSectionConfig = {
  title: string;
  endpoint: string;
  filterParam: string;
  columns: Array<{ key: string; label: string }>;
};

type FilterConfig = {
  param: string;
  label: string;
  kind: "franchise" | "active";
};

type PageConfig = {
  title: string;
  description: string;
  newLabel: string;
  endpoint: string;
  searchPlaceholder: string;
  columns: Array<{ key: string; label: string; sortField?: string }>;
  fields: FieldConfig[];
  relatedSections?: RelatedSectionConfig[];
  filters?: FilterConfig[];
};

type OptionState = {
  franchises: SelectOption[];
  characters: SelectOption[];
  characterForms: SelectOption[];
  figures: SelectOption[];
};

type EntityComboboxProps = {
  options: SelectOption[];
  value: string;
  placeholder: string;
  disabled?: boolean;
  nullable?: boolean;
  onChange: (value: string) => void;
};

const EntityCombobox = ({
  options,
  value,
  placeholder,
  disabled,
  nullable,
  onChange,
}: EntityComboboxProps) => {
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
            {selectedOption ? selectedOption.label : nullable ? "None" : placeholder}
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

const emptyOptions: OptionState = {
  franchises: [],
  characters: [],
  characterForms: [],
  figures: [],
};

const loadMethodOptions = [
  { id: 0, label: "MANUAL" },
  { id: 1, label: "SCRAPED" },
  { id: 2, label: "GENERATED" },
  { id: 3, label: "IMPORTED" },
];

const endpoints = {
  characters: `${API_BASE_URL}/v1/characters`,
  characterAliases: `${API_BASE_URL}/v1/character-aliases`,
  characterForms: `${API_BASE_URL}/v1/character-forms`,
  characterFormAliases: `${API_BASE_URL}/v1/character-form-aliases`,
  figureCharacters: `${API_BASE_URL}/v1/figure-characters`,
  franchises: `${API_BASE_URL}/v1/franchises`,
  figures: `${API_BASE_URL}/v1/figures`,
};

const adminRouteByEndpoint: Record<string, string> = {
  [endpoints.characterAliases]: "/character-admin/character-aliases",
  [endpoints.characterForms]: "/character-admin/character-forms",
  [endpoints.characterFormAliases]: "/character-admin/character-form-aliases",
  [endpoints.figureCharacters]: "/character-admin/figure-characters",
};

const relationLoaders = {
  franchises: {
    endpoint: endpoints.franchises,
    map: (item: EntityRecord) => ({ id: Number(item.id), label: String(item.name || item.slug || item.id) }),
  },
  characters: {
    endpoint: endpoints.characters,
    map: (item: EntityRecord) => ({ id: Number(item.id), label: String(item.canonicalName || item.characterName || item.id) }),
  },
  characterForms: {
    endpoint: endpoints.characterForms,
    map: (item: EntityRecord) => {
      const formName = String(item.canonicalName || item.characterFormName || item.id);
      const characterName = item.characterName ? String(item.characterName) : "";
      return {
        id: Number(item.id),
        label: characterName ? `${characterName} - ${formName}` : formName,
      };
    },
  },
  figures: {
    endpoint: endpoints.figures,
    map: (item: EntityRecord) => ({ id: Number(item.id), label: String(item.name || item.slug || item.id) }),
  },
} satisfies Record<keyof OptionState, { endpoint: string; map: (item: EntityRecord) => SelectOption }>;

const valueToString = (value: unknown) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

const buildInitialForm = (fields: FieldConfig[], record: EntityRecord | null) =>
  Object.fromEntries(
    fields.map((field) => [
      field.name,
      record?.[field.name] === undefined || record?.[field.name] === null
        ? field.defaultValue || ""
        : String(record[field.name]),
    ])
  );

const CharacterAdminPage = ({ config }: { config: PageConfig }) => {
  const [rows, setRows] = useState<EntityRecord[]>([]);
  const [options, setOptions] = useState<OptionState>(emptyOptions);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editableDerivedFields, setEditableDerivedFields] = useState<Record<string, boolean>>({});
  const [relatedRows, setRelatedRows] = useState<Record<string, EntityRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ field: string; direction: "asc" | "desc" }>({
    field: "id",
    direction: "asc",
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [pageMeta, setPageMeta] = useState(defaultPageMeta);
  const [apiError, setApiError] = useState<ApiErrorResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EntityRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<EntityRecord | null>(null);
  const mutating = saving || deleting;

  const buildFilteredEndpoint = () => {
    const params = new URLSearchParams();

    (config.filters || []).forEach((filterDef) => {
      const value = filters[filterDef.param];
      if (value) params.set(filterDef.param, value);
    });

    const query = params.toString();
    return query ? `${config.endpoint}?${query}` : config.endpoint;
  };

  const fetchRows = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const response = await authFetch(
        withPagination(buildFilteredEndpoint(), page, pageSize, `${sort.field},${sort.direction}`)
      );

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, `Error fetching ${config.title}.`));
        return;
      }

      const data = await response.json();
      setRows(getPageContent<EntityRecord>(data));
      setPageMeta(getPageMeta<EntityRecord>(data, pageSize));
    } catch (error) {
      setApiError(toClientApiError(error, `Error fetching ${config.title}.`));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchOptions = async () => {
    setLoadingOptions(true);

    try {
      const needed = new Set(config.fields.map((field) => field.optionsKey).filter(Boolean));
      const entries = await Promise.all(
        Array.from(needed).map(async (key) => {
          const loader = relationLoaders[key as keyof OptionState];
          const response = await authFetch(withPageSize(loader.endpoint));
          if (!response.ok) return [key, []] as const;
          const data = await response.json();
          return [key, getPageContent<EntityRecord>(data).map(loader.map)] as const;
        })
      );

      setOptions({ ...emptyOptions, ...Object.fromEntries(entries) });
    } catch (error) {
      setApiError(toClientApiError(error, "Error fetching select options."));
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchRelatedRows = async (record: EntityRecord | null) => {
    if (!record?.id || !config.relatedSections) {
      setRelatedRows({});
      return;
    }

    const result: Record<string, EntityRecord[]> = {};

    await Promise.all(
      config.relatedSections.map(async (section) => {
        const response = await authFetch(withPageSize(`${section.endpoint}?${section.filterParam}=${record.id}`));
        if (!response.ok) return;
        const data = await response.json();
        result[section.title] = getPageContent<EntityRecord>(data);
      })
    );

    setRelatedRows(result);
  };

  useEffect(() => {
    fetchRows();
  }, [page, pageSize, config.endpoint, filters, sort]);

  useEffect(() => {
    fetchOptions();
  }, [config.endpoint]);

  useEffect(() => {
    setPage(0);
  }, [search, filters]);

  const handleSort = (field: string) => {
    setSort((current) =>
      current.field === field
        ? { field, direction: current.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "asc" }
    );
    setPage(0);
  };

  const updateFilter = (param: string, value: string) => {
    setFilters((current) => ({ ...current, [param]: value }));
  };

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      Object.values(row)
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [rows, search]);

  const openCreateDialog = () => {
    setSelectedRecord(null);
    setForm(buildInitialForm(config.fields, null));
    setEditableDerivedFields({});
    setRelatedRows({});
    setDialogOpen(true);
  };

  const openEditDialog = async (record: EntityRecord) => {
    setSelectedRecord(record);
    setForm(buildInitialForm(config.fields, record));
    setEditableDerivedFields({});
    setDialogOpen(true);
    await fetchRelatedRows(record);
  };

  const handleChange = (name: string, value: string) => {
    setForm((current) => {
      const next = { ...current, [name]: value };

      config.fields.forEach((field) => {
        if (
          field.lockedDerivedFrom === name &&
          !editableDerivedFields[field.name] &&
          field.deriveValue
        ) {
          next[field.name] = field.deriveValue(value);
        }
      });

      return next;
    });
  };

  const buildPayload = () => {
    const payload: Record<string, string | number | boolean | null> = {};

    config.fields.forEach((field) => {
      const rawValue = form[field.name]?.trim() ?? "";

      if (!rawValue && field.nullable) {
        payload[field.name] = null;
        return;
      }

      if (!rawValue && !field.required) return;

      if (field.type === "number" || field.type === "select") {
        if (field.staticOptions) {
          payload[field.name] = rawValue;
        } else {
          payload[field.name] = Number(rawValue);
        }
        return;
      }

      if (field.type === "boolean") {
        payload[field.name] = rawValue === "true";
        return;
      }

      payload[field.name] = rawValue;
    });

    return payload;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const isEditing = Boolean(selectedRecord?.id);
    const endpoint = isEditing ? `${config.endpoint}/${selectedRecord?.id}` : config.endpoint;

    try {
      const response = await authFetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, `Error saving ${config.title}.`));
        return;
      }

      await fetchRows(false);
      setDialogOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      setApiError(toClientApiError(error, `Error saving ${config.title}.`));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete?.id) return;
    setDeleting(true);

    try {
      const response = await authFetch(`${config.endpoint}/${recordToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setApiError(await readApiErrorResponse(response, `Error deleting ${config.title}.`));
        return;
      }

      await fetchRows(false);
      setRecordToDelete(null);
    } catch (error) {
      setApiError(toClientApiError(error, `Error deleting ${config.title}.`));
    } finally {
      setDeleting(false);
    }
  };

  const renderField = (field: FieldConfig) => {
    const value = form[field.name] ?? "";
    const labelClass = "mb-1 block text-sm font-medium text-foreground";
    const helperClass = "mt-1 text-xs text-muted-foreground";
    const selectClass = "w-full rounded border border-input bg-background p-2 text-foreground";
    const optionClass = "bg-background text-foreground";
    const requiredMark = field.required ? <span className="text-destructive">*</span> : null;
    const fieldClass = field.fullWidth ? "md:col-span-2" : undefined;

    if (field.type === "boolean") {
      return (
        <div key={field.name} className={fieldClass}>
          <label className={labelClass}>{field.label} {requiredMark}</label>
          <select className={selectClass} value={value || "true"} onChange={(event) => handleChange(field.name, event.target.value)}>
            <option className={optionClass} value="true">Yes</option>
            <option className={optionClass} value="false">No</option>
          </select>
          <p className={helperClass}>{field.helper}</p>
        </div>
      );
    }

    if (field.type === "select") {
      const fieldOptions = field.staticOptions || (field.optionsKey ? options[field.optionsKey] : []);

      if (field.optionsKey && !field.staticOptions) {
        return (
          <div key={field.name} className={fieldClass}>
            <label className={labelClass}>{field.label} {requiredMark}</label>
            <EntityCombobox
              options={fieldOptions}
              value={value}
              placeholder={loadingOptions ? "Loading options..." : `Select ${field.label}`}
              disabled={loadingOptions}
              nullable={field.nullable}
              onChange={(nextValue) => handleChange(field.name, nextValue)}
            />
            <input value={value} required={field.required} className="sr-only" onChange={() => undefined} />
            <p className={helperClass}>{field.helper}</p>
          </div>
        );
      }

      return (
        <div key={field.name} className={fieldClass}>
          <label className={labelClass}>{field.label} {requiredMark}</label>
          <select
            className={selectClass}
            value={value}
            required={field.required}
            disabled={loadingOptions}
            onChange={(event) => handleChange(field.name, event.target.value)}
          >
            <option className={optionClass} value="">
              {field.nullable ? "None" : loadingOptions ? "Loading options..." : `Select ${field.label}`}
            </option>
            {fieldOptions.map((option) => (
              <option className={optionClass} key={`${field.name}-${option.id}-${option.label}`} value={field.staticOptions ? option.label : option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p className={helperClass}>{field.helper}</p>
        </div>
      );
    }

    return (
      <div key={field.name} className={fieldClass}>
        <label className={labelClass}>{field.label} {requiredMark}</label>
        <div className={field.lockedDerivedFrom ? "flex gap-2" : undefined}>
          <Input
            name={field.name}
            type={field.type}
            maxLength={field.maxLength}
            value={value}
            required={field.required}
            min={field.type === "number" ? 0 : undefined}
            disabled={Boolean(field.lockedDerivedFrom) && !editableDerivedFields[field.name]}
            onChange={(event) => handleChange(field.name, event.target.value)}
          />
          {field.lockedDerivedFrom && (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setEditableDerivedFields((current) => ({
                  ...current,
                  [field.name]: !current[field.name],
                }))
              }
            >
              {editableDerivedFields[field.name] ? "Lock" : "Edit"}
            </Button>
          )}
        </div>
        <p className={helperClass}>{field.helper}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ApiErrorToast error={apiError} onClose={() => setApiError(null)} />

      <main className="container py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{config.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{config.description}</p>
          </div>

          <Button type="button" className="gap-2 md:self-center" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            {config.newLabel}
          </Button>
        </div>

        <div className="mt-6 rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={config.searchPlaceholder} className="pl-9" />
            </div>

            <p className="text-sm text-muted-foreground">
              {filteredRows.length} shown - {pageMeta.totalElements} total records
            </p>
          </div>

          {config.filters && config.filters.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {config.filters.map((filterDef) =>
                filterDef.kind === "franchise" ? (
                  <select
                    key={filterDef.param}
                    value={filters[filterDef.param] || ""}
                    disabled={loadingOptions}
                    onChange={(event) => updateFilter(filterDef.param, event.target.value)}
                    className="rounded border border-input bg-background p-2 text-sm text-foreground"
                  >
                    <option value="">All {filterDef.label.toLowerCase()}s</option>
                    {options.franchises.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    key={filterDef.param}
                    value={filters[filterDef.param] || ""}
                    onChange={(event) => updateFilter(filterDef.param, event.target.value)}
                    className="rounded border border-input bg-background p-2 text-sm text-foreground"
                  >
                    <option value="">All {filterDef.label.toLowerCase()} states</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                )
              )}
            </div>
          )}
        </div>

        <LoadingOverlay active={mutating} message={`Updating ${config.title}...`} className="mt-4">
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {config.columns.map((column) =>
                      column.sortField ? (
                        <TableHead key={column.key}>
                          <button
                            type="button"
                            onClick={() => handleSort(column.sortField as string)}
                            className="inline-flex items-center gap-1 text-left hover:text-foreground"
                          >
                            {column.label}
                            {sort.field === column.sortField ? (
                              sort.direction === "asc" ? (
                                <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </TableHead>
                      ) : (
                        <TableHead key={column.key}>{column.label}</TableHead>
                      )
                    )}
                    <TableHead className="w-48 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={config.columns.length + 1} className="h-28 text-center text-muted-foreground">
                        Loading {config.title}...
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={config.columns.length + 1} className="h-28 text-center text-muted-foreground">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow key={String(row.id)}>
                        {config.columns.map((column) => (
                          <TableCell key={`${row.id}-${column.key}`}>{valueToString(row[column.key]) || "-"}</TableCell>
                        ))}
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(row)}>
                              Actualizar
                            </Button>
                            <Button type="button" variant="destructive" size="sm" onClick={() => setRecordToDelete(row)}>
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <LoadingOverlay active={saving} label={`Saving ${config.title}...`} />
          <DialogHeader>
            <DialogTitle>{selectedRecord ? `Update ${config.title}` : config.newLabel}</DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">{config.fields.map(renderField)}</div>

            {selectedRecord?.id && config.relatedSections && (
              <Tabs defaultValue={config.relatedSections[0]?.title} className="mt-2">
                <TabsList className="flex h-auto flex-wrap justify-start">
                  {config.relatedSections.map((section) => (
                    <TabsTrigger key={section.title} value={section.title}>
                      {section.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {config.relatedSections.map((section) => (
                  <TabsContent key={section.title} value={section.title}>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground">{section.title}</h3>
                        <Link className="text-sm text-primary hover:underline" to={adminRouteByEndpoint[section.endpoint] || "/character-admin/characters"}>
                          Open {section.title}
                        </Link>
                      </div>
                      {(relatedRows[section.title] || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No related records found.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {section.columns.map((column) => (
                                  <TableHead key={column.key}>{column.label}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(relatedRows[section.title] || []).map((row) => (
                                <TableRow key={String(row.id)}>
                                  {section.columns.map((column) => (
                                    <TableCell key={`${row.id}-${column.key}`}>{valueToString(row[column.key]) || "-"}</TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : selectedRecord ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(recordToDelete)}
        onOpenChange={(open) => {
          if (!open) setRecordToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete record #{recordToDelete?.id}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting} onClick={handleDelete}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const characterFields: FieldConfig[] = [
  { name: "canonicalName", label: "Canonical Name", type: "text", required: true, helper: "Main character name." },
  {
    name: "japaneseName",
    label: "Japanese Name",
    type: "text",
    nullable: true,
    maxLength: 255,
    helper: 'Nombre en japones, formato "Katakana (Romaji)", ej. "ガッツ (Gattsu)".',
  },
  {
    name: "normalizedName",
    label: "Normalized Name",
    type: "text",
    required: true,
    helper: "Lowercase lookup name derived from Canonical Name unless manually edited.",
    lockedDerivedFrom: "canonicalName",
    deriveValue: (value) => value.trim().toLowerCase(),
  },
  { name: "franchiseId", label: "Franchise", type: "select", required: true, optionsKey: "franchises", helper: "Franchise this character belongs to." },
  { name: "active", label: "Active", type: "boolean", required: true, defaultValue: "true", helper: "Whether this character is active." },
];

const characterAliasFields: FieldConfig[] = [
  { name: "characterId", label: "Character", type: "select", required: true, optionsKey: "characters", helper: "Character that owns this alias." },
  { name: "alias", label: "Character Alias", type: "text", required: true, maxLength: 255, helper: "Alternate character name." },
  {
    name: "aliasNormalized",
    label: "Character Alias Normalized",
    type: "text",
    required: true,
    maxLength: 255,
    helper: "Lowercase alias used for matching unless manually edited.",
    lockedDerivedFrom: "alias",
    deriveValue: (value) => value.trim().toLowerCase(),
  },
  { name: "loadMethod", label: "Load Method", type: "select", required: true, defaultValue: "MANUAL", staticOptions: loadMethodOptions, helper: "How this alias was loaded." },
  { name: "active", label: "Active", type: "boolean", required: true, defaultValue: "true", helper: "Whether this character alias is active." },
];

const characterFormFields: FieldConfig[] = [
  { name: "characterId", label: "Character", type: "select", required: true, optionsKey: "characters", helper: "Base character for this form." },
  { name: "canonicalName", label: "Character Form Canonical Name", type: "text", required: true, helper: "Canonical name of the character form." },
  {
    name: "normalizedName",
    label: "Character Form Normalized Name",
    type: "text",
    required: true,
    helper: "Lowercase form name used for lookups unless manually edited.",
    lockedDerivedFrom: "canonicalName",
    deriveValue: (value) => value.trim().toLowerCase(),
  },
  { name: "active", label: "Active", type: "boolean", required: true, defaultValue: "true", helper: "Whether this character form is active." },
];

const characterFormAliasFields: FieldConfig[] = [
  { name: "characterFormId", label: "Character Form", type: "select", required: true, optionsKey: "characterForms", helper: "Character form that owns this alias.", fullWidth: true },
  { name: "alias", label: "Character Form Alias", type: "text", required: true, maxLength: 255, helper: "Alternate character form name." },
  {
    name: "aliasNormalized",
    label: "Character Form Alias Normalized",
    type: "text",
    required: true,
    maxLength: 255,
    helper: "Lowercase form alias used for matching unless manually edited.",
    lockedDerivedFrom: "alias",
    deriveValue: (value) => value.trim().toLowerCase(),
  },
  { name: "loadMethod", label: "Load Method", type: "select", required: true, defaultValue: "MANUAL", staticOptions: loadMethodOptions, helper: "How this form alias was loaded." },
  { name: "active", label: "Active", type: "boolean", required: true, defaultValue: "true", helper: "Whether this character form alias is active." },
];

const figureCharacterFields: FieldConfig[] = [
  { name: "figureId", label: "Figure", type: "select", required: true, optionsKey: "figures", helper: "Figure being associated." },
  { name: "characterId", label: "Character", type: "select", required: true, optionsKey: "characters", helper: "Character represented by the figure." },
  { name: "characterFormId", label: "Character Form", type: "select", nullable: true, optionsKey: "characterForms", helper: "Optional character form represented by the figure." },
  { name: "primaryCharacter", label: "Primary Character", type: "boolean", required: true, defaultValue: "false", helper: "Marks the main represented character." },
  { name: "displayOrder", label: "Display Order", type: "number", required: true, defaultValue: "0", helper: "Ordering when multiple characters are attached." },
];

export const CharacterPage = () => (
  <CharacterAdminPage
    config={{
      title: "Characters",
      description: "Manage canonical characters connected to franchises.",
      newLabel: "New Character",
      endpoint: endpoints.characters,
      searchPlaceholder: "Search characters",
      columns: [
        { key: "id", label: "ID" },
        { key: "canonicalName", label: "Canonical Name", sortField: "canonicalName" },
        { key: "japaneseName", label: "Japanese Name" },
        { key: "normalizedName", label: "Normalized Name" },
        { key: "franchiseName", label: "Franchise", sortField: "franchiseId" },
        { key: "active", label: "Active" },
      ],
      fields: characterFields,
      filters: [
        { param: "franchiseId", label: "Franchise", kind: "franchise" },
        { param: "active", label: "Status", kind: "active" },
      ],
      relatedSections: [
        {
          title: "Character Aliases",
          endpoint: endpoints.characterAliases,
          filterParam: "characterId",
          columns: [
            { key: "id", label: "ID" },
            { key: "alias", label: "Character Alias" },
            { key: "aliasNormalized", label: "Normalized" },
            { key: "loadMethod", label: "Load Method" },
            { key: "active", label: "Active" },
          ],
        },
        {
          title: "Character Forms",
          endpoint: endpoints.characterForms,
          filterParam: "characterId",
          columns: [
            { key: "id", label: "ID" },
            { key: "canonicalName", label: "Character Form" },
            { key: "normalizedName", label: "Normalized" },
            { key: "active", label: "Active" },
          ],
        },
      ],
    }}
  />
);

export const CharacterAliasPage = () => (
  <CharacterAdminPage
    config={{
      title: "Character Aliases",
      description: "Manage alternate names for characters.",
      newLabel: "New Character Alias",
      endpoint: endpoints.characterAliases,
      searchPlaceholder: "Search character aliases",
      columns: [
        { key: "id", label: "ID" },
        { key: "characterName", label: "Character" },
        { key: "alias", label: "Character Alias" },
        { key: "aliasNormalized", label: "Normalized" },
        { key: "loadMethod", label: "Load Method" },
        { key: "active", label: "Active" },
      ],
      fields: characterAliasFields,
    }}
  />
);

export const CharacterFormPage = () => (
  <CharacterAdminPage
    config={{
      title: "Character Forms",
      description: "Manage named forms, transformations, costumes, or variants of characters.",
      newLabel: "New Character Form",
      endpoint: endpoints.characterForms,
      searchPlaceholder: "Search character forms",
      columns: [
        { key: "id", label: "ID" },
        { key: "characterName", label: "Character" },
        { key: "canonicalName", label: "Character Form" },
        { key: "normalizedName", label: "Normalized" },
        { key: "active", label: "Active" },
      ],
      fields: characterFormFields,
      relatedSections: [
        {
          title: "Character Form Aliases",
          endpoint: endpoints.characterFormAliases,
          filterParam: "characterFormId",
          columns: [
            { key: "id", label: "ID" },
            { key: "alias", label: "Character Form Alias" },
            { key: "aliasNormalized", label: "Normalized" },
            { key: "loadMethod", label: "Load Method" },
            { key: "active", label: "Active" },
          ],
        },
      ],
    }}
  />
);

export const CharacterFormAliasPage = () => (
  <CharacterAdminPage
    config={{
      title: "Character Form Aliases",
      description: "Manage alternate names for specific character forms.",
      newLabel: "New Character Form Alias",
      endpoint: endpoints.characterFormAliases,
      searchPlaceholder: "Search character form aliases",
      columns: [
        { key: "id", label: "ID" },
        { key: "characterFormName", label: "Character Form" },
        { key: "alias", label: "Character Form Alias" },
        { key: "aliasNormalized", label: "Normalized" },
        { key: "loadMethod", label: "Load Method" },
        { key: "active", label: "Active" },
      ],
      fields: characterFormAliasFields,
    }}
  />
);

export const FigureCharacterPage = () => (
  <CharacterAdminPage
    config={{
      title: "Figure Characters",
      description: "Associate figures with characters and optional character forms.",
      newLabel: "New Figure Character",
      endpoint: endpoints.figureCharacters,
      searchPlaceholder: "Search figure characters",
      columns: [
        { key: "id", label: "ID" },
        { key: "figureName", label: "Figure" },
        { key: "characterName", label: "Character" },
        { key: "characterFormName", label: "Character Form" },
        { key: "primaryCharacter", label: "Primary" },
        { key: "displayOrder", label: "Order" },
      ],
      fields: figureCharacterFields,
    }}
  />
);
