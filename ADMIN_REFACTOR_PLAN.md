# Plan de separación y mejora — Admin (milo-front-admin)

> Estado: propuesto, 2026-08-01. Complementa a `UI_SPLIT_PLAN.md` (que definió la separación de
> UIs a alto nivel) con dos cosas que ese documento no cubre: (1) una auditoría concreta del
> estado actual del código admin, con números, y (2) un plan de refactor priorizado para que el
> back-office aguante crecer como proyecto enterprise en vez de seguir acumulando deuda.
>
> Actualización de contexto respecto a `UI_SPLIT_PLAN.md`: el catálogo público **ya se creó**
> como repo separado (`milo-figure-market`, Next.js), no es un "repo nuevo por crear" — está
> pendiente su deploy a Vercel. Este documento asume ese hecho.

---

## 1. Objetivo y alcance

Este repo va a dejar de ser "SPA con dos superficies mezcladas" para ser **exclusivamente el
back-office** del pipeline de datos. Se trata como proyecto enterprise: va a seguir creciendo
(más fuentes de scraping, más flujos de revisión como el de discovery candidates, eventualmente
usuarios y roles reales), así que el criterio no es "que funcione hoy" sino que sea sostenible
en el tiempo — código legible, capas claras, sin duplicación, con una barrera de seguridad real.

Alcance de este documento: auditoría del estado actual (virtudes y falencias), plan de
separación (resumen, ya detallado en `UI_SPLIT_PLAN.md`), plan de autenticación, y plan de
refactor de código con prioridades y orden de ejecución.

---

## 2. Estado actual — auditoría

### 2.1 Virtudes (lo que ya está bien y no hay que tocar)

- **Capa de datos base bien diseñada**: `src/lib/apiClient.ts` (`apiRequest` genérico con
  manejo de query params, JSON body y errores), `src/lib/apiError.ts` (normalización de
  `ApiErrorResponse`) y `src/lib/page.ts` (helpers para el envelope `Page<T>` de Spring). Es una
  base sólida — el problema no es que falte, es que no se usa en todos lados (ver 2.2).
- **El patrón correcto de módulos de dominio ya existe**: `src/api/franchiseApi.ts`,
  `figureApi.ts`, `figureAliasApi.ts`, `figureAliasGeneratorApi.ts`, `scrapingRunnerApi.ts` son
  módulos delgados construidos sobre `apiRequest`, con sus tipos exportados. Este es exactamente
  el target al que hay que migrar todo lo demás — no hay que inventar arquitectura nueva, hay
  que generalizar la que ya está bien hecha.
- **Componentes UI consistentes**: patrón `XTable` / `XFormDialog` repetido en todos los
  dominios (Figure, Source, FigureSourceListing, CandidateReview, DiscoveryCandidateReview),
  `<ApiErrorToast>`, `<LoadingOverlay>`, `<PageControls>` reutilizados en vez de reinventados
  por página.
- **Theming centralizado**: un solo archivo de acento (`src/styles/theme.css`) sobre tokens
  neutrales en `index.css`. La convención ya demostró ser portable: se replicó con éxito en
  `milo-figure-market` sin fricción.
- **Code-splitting por ruta** ya aplicado con `React.lazy` + `Suspense` en `App.tsx`.
- **Reference data centralizada** en `useReferenceData()` en vez de enums sueltos por archivo
  (aunque con fallbacks duplicados — ver falencias).

### 2.2 Falencias (ordenadas por severidad)

| # | Severidad | Falencia | Evidencia |
|---|---|---|---|
| 1 | **Crítico** | Cero autenticación/autorización, ni en front ni en backend | Cualquiera con la URL de la API lee/escribe datos sin pasar por el front |
| 2 | **Crítico** | God components / archivos monolíticos | `ScrapingRunnerPage.tsx` 1518 líneas, `FigureFormDialog.tsx` 1437, `CharacterAdminPages.tsx` 1102 (5 páginas en 1 archivo), `FigureAliasGeneratorPage.tsx` 1087 |
| 3 | **Alto** | Tres patrones de acceso a datos conviviendo sin resolver | `fetch()` inline (~39 llamadas en 7 archivos que quedan en admin), módulos `src/api/*.ts` (patrón correcto), `apiRequest` directo en páginas nuevas (`useReferenceData`, `DiscoveryCandidateReviewPage`) |
| 4 | **Alto** | `API_BASE_URL` redefinido de forma independiente en vez de importado | Duplicado en 7 archivos admin (`FigurePage`, `CandidateReviewPage`, `FigureFormDialog`, `CharacterAdminPages`, `FigureSourceListingPage`, `SourcePage`, `FranchisePage`) además de su definición original en `apiClient.ts` |
| 5 | **Medio** | TypeScript con red de seguridad floja | `tsconfig.app.json`: `"strict": false`, `"noImplicitAny": false`, `"noUnusedLocals": false` |
| 6 | **Medio** | Gestión de estado de servidor inconsistente | TanStack Query instalado pero usado en un solo hook (`useFranchises`); el resto es `useState` + `useEffect` + `Promise.all` repetido a mano por página |
| 7 | **Bajo** | Posibles dependencias muertas | `next-themes` (el dark mode es manual en `Navbar`), `recharts`, `embla-carousel-react`, `input-otp`, `vaul` — auditar uso real antes de sacarlas |
| 8 | **Bajo** | Fallbacks de reference data hardcodeados y duplicados por página | Cada página admin repite sus propios arrays de fallback en vez de un archivo único de constantes |
| 9 | **Bajo** | `CharacterAdminPages.tsx` rompe parte del beneficio del lazy-loading | Las 5 páginas que exporta comparten un mismo chunk JS; entrar a cualquiera descarga el código de las otras 4 |

No se incluye como falencia la ausencia de tests: es una decisión de alcance explícita del
proyecto, no un defecto a corregir en este plan.

---

## 3. Separación en dos repos (resumen — detalle completo en `UI_SPLIT_PLAN.md`)

- **Backend** (`figure-market-core`, Spring/Render): no se toca.
- **Market** (`milo-figure-market`, Next.js): ya creado, pendiente deploy a Vercel.
- **Admin** (este repo): mismo stack (Vite + React + TS + shadcn), se le quitan las páginas
  públicas (`Index`, `AnimeDetail`, `FigureDetail`, y probablemente `ColorTest`) una vez que el
  market esté en producción, y `/` pasa a ser un dashboard o redirect a `/work/figure`.

---

## 4. Autenticación — bloqueante antes de exponer el admin a internet

La seguridad real vive en el **backend**: sin eso, un login solo en el front es decorativo.

- **Backend**: Spring Security, tabla de usuarios + roles, JWT (access + refresh) o sesión. La
  API debe exigir token/sesión válida en cada request administrativo.
- **Front**: pantalla de login, interceptor en `apiClient.ts` que adjunte el token y maneje 401
  globalmente (logout + redirect), `ProtectedRoute` que envuelva las rutas `/work/*`,
  `/figure-admin/*`, `/character-admin/*`.
- **Dónde guardar el token**: evitar `localStorage` plano (vulnerable a XSS). Preferir cookie
  `httpOnly` si el dominio del admin y el backend lo permiten (requiere resolver CORS/SameSite
  entre el hosting del admin y Render); si no es viable, token en memoria + refresh silencioso
  vía endpoint dedicado.

---

## 5. Refactor de código — plan concreto

### 5.1 Unificar la capa de datos (misma prioridad que autenticación)

- Migrar cada página que hoy usa `fetch()` inline a un módulo `src/api/*.ts` sobre `apiRequest`,
  siguiendo el patrón que ya existe en `franchiseApi.ts` / `figureApi.ts`. Crear los módulos que
  faltan: `figureSourceListingApi.ts`, `sourceApi.ts`, `characterApi.ts`, `candidateApi.ts`,
  `discoveryCandidateApi.ts`.
- Eliminar las 7 redefiniciones de `API_BASE_URL`; importar siempre desde `apiClient.ts`.
- Meta objetivo: **cero** llamadas a `fetch()` fuera de `apiClient.ts`.

### 5.2 Partir los god components

Esto es lo más urgente de resolver en código (marcado explícitamente como crítico): ningún
archivo de página o componente debería superar ~300-400 líneas salvo excepción justificada.

| Archivo | Líneas hoy | Acción propuesta |
|---|---|---|
| `ScrapingRunnerPage.tsx` | 1518 | Extraer los componentes inline a `src/components/scrapingRunner/` (uno por responsabilidad: query runner, resultados, matches) |
| `FigureFormDialog.tsx` | 1437 | Separar en subformularios por sección (identidad, precio/fuente, imágenes, aliases) + un hook de estado propio |
| `CharacterAdminPages.tsx` | 1102 | Partir en un archivo por página real bajo `src/pages/character-admin/` (`CharacterPage.tsx`, `CharacterAliasPage.tsx`, etc.) |
| `FigureAliasGeneratorPage.tsx` | 1087 | Extraer los paneles/tabs a componentes propios en `src/components/figureAliasGenerator/` |
| `FigurePage.tsx` | 677 | Extraer filtros y diálogos de confirmación a componentes |
| `CandidateReviewPage.tsx` | 633 | Extraer filtros y diálogos de confirmación a componentes (mismo tratamiento que `FigurePage`) |

### 5.3 Adoptar TanStack Query de forma consistente

Reemplazar `useState` + `useEffect` + `Promise.all` manual por hooks `useXQuery` / `useXMutation`
por dominio, construidos sobre los módulos de `src/api/`. Beneficio directo: cache, invalidación
automática tras mutar, y bastante menos código repetido de loading/error por página.

### 5.4 Subir el strict de TypeScript de forma gradual

No conviene activar `strict: true` de un salto (rompería buena parte del proyecto de golpe).
Camino sugerido: activar `noImplicitAny` primero, corregir carpeta por carpeta, y recién después
evaluar `strict` completo.

### 5.5 Podar dependencias muertas

Auditar con un grep de imports reales si `next-themes`, `recharts`, `embla-carousel-react`,
`input-otp` y `vaul` siguen usándose antes de sacarlas de `package.json`.

---

## 6. Orden de ejecución sugerido

1. **Deploy del market** (`milo-figure-market` a Vercel) — ya en curso, fuera de este repo.
2. **Autenticación backend + login front** — bloqueante para exponer el admin de forma segura;
   hacerlo temprano evita reabrir rutas ya refactorizadas para agregarle guards después.
3. **Adelgazar este repo a admin puro** — borrar páginas públicas, redirect de `/`.
4. **Unificar capa de datos** (fetch → módulos `src/api/*.ts`) — mecánico, bajo riesgo, alto
   valor; buena tarea para hacer en paralelo por dominio.
5. **Partir los god components** — el más manual, ir de a uno; empezar por
   `ScrapingRunnerPage.tsx` y `FigureFormDialog.tsx` por ser los más grandes.
6. **TanStack Query consistente + TS strict incremental.**
7. **Poda de dependencias muertas** — al final, cuando ya no haya código en refactor activo que
   pueda depender de algo que se creía muerto.

---

## 7. Qué NO se hace (decisiones ya tomadas, no reabrir)

- No migrar el admin a Next.js ni a ningún otro framework — Vite SPA es correcto para un
  back-office con auth, sin necesidad de SEO/SSR.
- No reescribir el admin desde cero.
- No hacer el refactor de código (sección 5) antes de separar los repos (paso 3) — se haría
  doble trabajo.
- No Flutter (decisión previa, ver `UI_SPLIT_PLAN.md`).
- No agregar tests como parte de este plan (fuera de alcance del proyecto).

---

## 8. Definición de "hecho"

- 0 llamadas a `fetch()` fuera de `apiClient.ts`.
- 0 archivos de página o componente por encima de ~400 líneas sin justificación documentada.
- 100% de las rutas admin protegidas por autenticación real de backend.
- `API_BASE_URL` definido en un único lugar (`apiClient.ts`).
- Todas las páginas usan un módulo `src/api/*.ts` en vez de construir URLs a mano.
