import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PreferencesProvider } from "@/lib/preferences";

const Index = lazy(() => import("./pages/Index.tsx"));
const AnimeDetail = lazy(() => import("./pages/AnimeDetail.tsx"));
const FigureDetail = lazy(() => import("./pages/FigureDetail.tsx"));
const ColorTest = lazy(() => import("./pages/ColorTest.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const FigurePage = lazy(() => import("./pages/FigurePage.tsx"));
const FigureAliasPage = lazy(() => import("./pages/FigureAliasPage.tsx"));
const FigureSourceListingPage = lazy(() => import("./pages/FigureSourceListingPage.tsx"));
const FranchisePage = lazy(() => import("./pages/FranchisePage.tsx"));
const SourcePage = lazy(() => import("./pages/SourcePage.tsx"));
const CandidateReviewPage = lazy(() => import("./pages/CandidateReviewPage.tsx"));
const DiscoveryCandidateReviewPage = lazy(() => import("./pages/DiscoveryCandidateReviewPage.tsx"));
const FigureAliasGeneratorPage = lazy(() => import("./pages/FigureAliasGeneratorPage.tsx"));
const ScrapingRunnerPage = lazy(() => import("./pages/ScrapingRunnerPage.tsx"));
const CharacterPage = lazy(() =>
    import("./pages/CharacterAdminPages.tsx").then((module) => ({ default: module.CharacterPage }))
);
const CharacterAliasPage = lazy(() =>
    import("./pages/CharacterAdminPages.tsx").then((module) => ({ default: module.CharacterAliasPage }))
);
const CharacterFormPage = lazy(() =>
    import("./pages/CharacterAdminPages.tsx").then((module) => ({ default: module.CharacterFormPage }))
);
const CharacterFormAliasPage = lazy(() =>
    import("./pages/CharacterAdminPages.tsx").then((module) => ({ default: module.CharacterFormAliasPage }))
);
const FigureCharacterPage = lazy(() =>
    import("./pages/CharacterAdminPages.tsx").then((module) => ({ default: module.FigureCharacterPage }))
);
const PrivacyPage = lazy(() => import("./pages/PrivacyPage.tsx"));
const TermsPage = lazy(() => import("./pages/TermsPage.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading...
    </div>
);

const App = () => (
    <QueryClientProvider client={queryClient}>
        <PreferencesProvider>
            <TooltipProvider>
                <Toaster />
                <Sonner />

                <BrowserRouter basename={import.meta.env.BASE_URL}>
                    <Suspense fallback={<RouteFallback />}>
                        <Routes>
                            <Route path="/" element={<Index />} />
                            <Route path="/anime/:animeId" element={<AnimeDetail />} />
                            <Route path="/figure/:figureId" element={<FigureDetail />} />
                            <Route path="/color-test" element={<ColorTest />} />
                            <Route path="/work/figure" element={<FigurePage />} />
                            <Route path="/work/figure-alias" element={<FigureAliasPage />} />
                            <Route path="/work/figure-source-listing" element={<FigureSourceListingPage />} />
                            <Route path="/work/figure-listing" element={<FigureSourceListingPage />} />
                            <Route path="/work/franchises" element={<FranchisePage />} />
                            <Route path="/work/sources" element={<SourcePage />} />
                            <Route path="/figure-admin/candidate-review" element={<CandidateReviewPage />} />
                            <Route path="/figure-admin/discovery-candidates" element={<DiscoveryCandidateReviewPage />} />
                            <Route path="/figure-admin/alias-generator" element={<FigureAliasGeneratorPage />} />
                            <Route path="/figure-admin/scraping-runner" element={<ScrapingRunnerPage />} />
                            <Route path="/character-admin/characters" element={<CharacterPage />} />
                            <Route path="/character-admin/character-aliases" element={<CharacterAliasPage />} />
                            <Route path="/character-admin/character-forms" element={<CharacterFormPage />} />
                            <Route path="/character-admin/character-form-aliases" element={<CharacterFormAliasPage />} />
                            <Route path="/character-admin/figure-characters" element={<FigureCharacterPage />} />
                            <Route path="/privacy" element={<PrivacyPage />} />
                            <Route path="/terms" element={<TermsPage />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </Suspense>
                </BrowserRouter>
            </TooltipProvider>
        </PreferencesProvider>
    </QueryClientProvider>
);

export default App;
