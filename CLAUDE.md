# CLAUDE.md

Este archivo provee orientación a Claude Code (claude.ai/code) cuando trabaja en este repositorio.

## Propósito del proyecto

**milo-front-admin** ("Milo", antes `anime-figure-market`) es una SPA con dos superficies:

1. **Catálogo público** — tienda para explorar franquicias y figuras de anime (`/`, `/anime/:id`, `/figure/:id`).
2. **Back-office de administración** — gestión del pipeline de datos bajo `/work/*`, `/figure-admin/*` y `/character-admin/*`. Esta es la superficie principal en desarrollo activo.

Backend: `figure-market-core` en `https://figure-market-core.onrender.com/api`.  
Deploy en GitHub Pages: `https://diegodzacarias.github.io/milo-front-admin`.

## Comandos

```bash
npm run dev          # servidor de desarrollo (Vite)
npm run lint         # ESLint
npm run test         # Vitest (ejecución única)
npm run test:watch   # Vitest (modo watch)
npm run preview      # previsualizar el último build localmente
```

**NO ejecutar `npm run build` ni `npm run deploy` salvo que el usuario lo pida explícitamente.**

## Arquitectura

### Routing

- `BrowserRouter` con `basename={import.meta.env.BASE_URL}` (requerido por GitHub Pages; el valor sale de `base` en `vite.config.ts`, que debe coincidir con el nombre del repo). Los links internos escritos a mano deben usar `import.meta.env.BASE_URL`, nunca el nombre del repo hardcodeado.
- Cada página se importa con `React.lazy()` dentro de `App.tsx`, envuelta en un `<Suspense>` global.
- `CharacterAdminPages.tsx` exporta múltiples páginas; cada una se extrae con `.then(m => ({ default: m.XPage }))`.

### Capa de API

Cliente central: `src/lib/apiClient.ts`

- `apiRequest<T>(path, options)` — envuelve `fetch`. Acepta un objeto `query` (`Record<string, ApiQueryValue>`), un atajo `json` para el body y un `fallbackMessage`. Omite automáticamente params con valor `null`/`undefined`/string vacío.
- Los errores se parsean en `ApiErrorResponse` via `src/lib/apiError.ts` (`readApiErrorResponse`, `normalizeApiError`, `toClientApiError`).
- Paginación: `src/lib/page.ts` modela los envelopes `Page<T>` de Spring. Helpers: `getPageContent`, `getPageMeta`, `defaultPageMeta`, `withPageSize`, `withPagination`.

> Algunas páginas admin antiguas aún llaman `fetch()` directamente. Para código nuevo, usar siempre `apiRequest`.

### Manejo de estado

- Sin librería de estado global.
- **Datos del servidor**: TanStack Query v5 se usa de forma selectiva (ej. `useFranchises`). La mayoría de páginas admin manejan el estado del servidor con `useState` + `useEffect` + `Promise.all` local.
- **Preferencias** (`currencyCode`, `languageCode`): React Context via `src/lib/preferences.tsx`, persistido en `localStorage` bajo la clave `milo.preferences`. Se consume con `usePreferences()`.
- **Modo oscuro**: toggled via `document.documentElement.classList.toggle("dark", ...)` en `Navbar.tsx`, persistido bajo la clave `milo-theme` en `localStorage`. NO usa `next-themes`.
- **Datos de referencia** (enums, monedas, estados): `useReferenceData()` en `src/hooks/useReferenceData.ts`, se fetchea una vez al montar via `apiRequest`. Las páginas mantienen arrays locales hardcodeados como fallback mientras no haya cargado.

### Convenciones de componentes

- `src/components/ui/` — primitivos de shadcn/ui (wrappers de Radix UI). No modificar salvo necesidad absoluta; agregar variantes personalizadas via `class-variance-authority`.
- Componentes `XFormDialog`: reciben la entidad o `null` (crear vs. editar), listas de opciones, booleanos `loading`/`saving` y callbacks de eventos como props.
- Componentes `XTable`: reciben array de datos, flag `loading` y callbacks de acciones (`onEdit`, `onDelete`, etc.).
- `<ApiErrorToast error={apiError} onClose={() => setApiError(null)} />` — patrón estándar de display de errores en todas las páginas.
- `<LoadingOverlay active={mutating}>` — envuelve tablas durante mutaciones.
- `<PageControls>` — se coloca debajo de toda tabla paginada.

### Imports

- `@/` mapea a `src/` (alias de Vite). Usar siempre para imports internos.

## Tests

**No generar tests de ningún tipo bajo ninguna circunstancia.** No crear unit tests, integration tests, E2E tests, mocks, fixtures, ni agregar dependencias de testing. No ejecutar suites de tests como forma de validación. No mencionar la ausencia de tests como problema.

## Pipeline de administración (dominio)

El pipeline de scraping funciona así:
1. Las **Figuras** tienen **Aliases** (manuales o generados por IA via `figureAliasGeneratorApi`).
2. Los aliases se usan como queries de búsqueda contra marketplaces externos (actualmente NinNinGame via `scrapingRunnerApi`).
3. Los resultados se convierten en **ScrapedListingCandidates**, revisados en `CandidateReviewPage`.
4. Los candidatos aprobados pasan a ser **FigureSourceListings**.

## Commits de Git

Usar formato conventional commits: `<tipo>: <descripción>`  
Tipos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

**Importante:** No incluir `Co-Authored-By: Claude` en commits. Claude es una herramienta, no un coautor. El trabajo pertenece al usuario. Usar `Co-Authored-By` solo si hay colaboradores humanos reales en el cambio.
