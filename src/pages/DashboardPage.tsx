import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import ApiErrorToast from "@/components/ui/api-error-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CatalogTab from "@/components/dashboard/CatalogTab";
import DateRangeSelector, { isValidRange, presetRange, type DashboardRange } from "@/components/dashboard/DateRangeSelector";
import OverviewTab from "@/components/dashboard/OverviewTab";
import ScrapingTab from "@/components/dashboard/ScrapingTab";
import UsageTab from "@/components/dashboard/UsageTab";
import type { ApiErrorResponse } from "@/lib/apiError";

const DashboardPage = () => {
  const [range, setRange] = useState<DashboardRange>(() => ({ ...presetRange(30), preset: "30" }));
  const [apiError, setApiError] = useState<ApiErrorResponse | null>(null);

  // Rango inválido → null: Uso y Scraping no llaman al backend (evita el 400).
  const queryRange = useMemo(
    () => (isValidRange(range) ? { from: range.from, to: range.to } : null),
    [range],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ApiErrorToast error={apiError} onClose={() => setApiError(null)} />

      <main className="container space-y-6 py-8 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Estado del catálogo, uso del sitio público y salud del scraping.
            </p>
          </div>
          <DateRangeSelector value={range} onChange={setRange} />
        </div>

        {!queryRange && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            La fecha de inicio debe ser anterior o igual a la fecha de fin.
          </p>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
            <TabsList>
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="catalog">Catálogo</TabsTrigger>
              <TabsTrigger value="usage">Uso del catálogo</TabsTrigger>
              <TabsTrigger value="scraping">Scraping</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <OverviewTab range={queryRange} onError={setApiError} />
          </TabsContent>
          <TabsContent value="catalog">
            <CatalogTab onError={setApiError} />
          </TabsContent>
          <TabsContent value="usage">
            <UsageTab range={queryRange} onError={setApiError} />
          </TabsContent>
          <TabsContent value="scraping">
            <ScrapingTab range={queryRange} onError={setApiError} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DashboardPage;
