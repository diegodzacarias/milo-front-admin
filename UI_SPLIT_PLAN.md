# Plan de separación de UIs — Market (público) y Admin (back-office)

> Documento de planificación, **diferido**: por ahora todo sigue en este repo por practicidad.
> Se ejecutará cuando termine la etapa actual del pipeline de scraping.
> Decisión relacionada: se descartó migrar a Flutter (web canvas = sin SEO, reescritura total);
> la vía a app Android del catálogo, si algún día se quiere, es PWA/TWA o Capacitor sobre la web.

---

## 1. Situación actual

Un solo repo (`milo-front-admin`, antes `anime-figure-market`) con las dos superficies mezcladas, deployado entero en
GitHub Pages. Origen del esqueleto: template de Lovable (`vite_react_shadcn_ts`).

| Superficie | Rutas actuales | Páginas |
|---|---|---|
| **Market** (pública) | `/`, `/anime/:animeId`, `/figure/:figureId` | `Index`, `AnimeDetail`, `FigureDetail` |
| **Herramienta dev** | `/color-test` | `ColorTest` (muere o se queda en admin) |
| **Admin** | `/work/*`, `/figure-admin/*`, `/character-admin/*` | `FigurePage`, `FigureAliasPage`, `FigureSourceListingPage`, `FranchisePage`, `SourcePage`, `CandidateReviewPage`, `FigureAliasGeneratorPage`, `ScrapingRunnerPage`, `CharacterAdminPages` (×5) |

Problema central: el catálogo público es una SPA → Google ve un `index.html` vacío
(el contenido se pinta por JS contra la API de Render). **Cero SEO, previews de links vacías.**
Para el admin eso es irrelevante; para una web de presentación de figuras es descalificante.

---

## 2. Arquitectura objetivo

```
                    figure-market-core (Spring, Render)
                        API REST — NO cambia
                       /                      \
        ┌─────────────────────────┐   ┌──────────────────────────────┐
        │  figure-market-web      │   │  milo-front-admin (este)     │
        │  (repo NUEVO)           │   │  queda como ADMIN            │
        │  Catálogo público       │   │  Back-office del pipeline    │
        │  Next.js + SSG/ISR      │   │  Vite + React SPA (igual)    │
        │  Vercel / CF Pages      │   │  GitHub Pages (igual)        │
        └─────────────────────────┘   └──────────────────────────────┘
```

El backend no se toca: ambos fronts consumen la misma API.

---

## 3. Market — proyecto nuevo (`figure-market-web`)

**Stack: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui.**

Por qué Next y no otra cosa:
- **SEO real**: cada ficha de figura se pre-renderiza como HTML indexable (SSG/ISR).
  Open Graph por figura → previews con imagen al compartir links.
- **Continuidad**: es React + Tailwind + shadcn — se reusa el conocimiento, el theme
  (`src/styles/theme.css`, tokens de `index.css`) y buena parte de los componentes visuales
  (`AnimeHero`, cards de figura, etc.). No es empezar de cero.
- Alternativa evaluada: Astro (más liviano para contenido estático). Next gana por continuidad.

Qué migra — **se reconstruye a partir del modelo visual** (cómo se ve la página hoy), no del
esqueleto del código actual, que quedó "como se pudo":
- `Index` → home con franquicias/figuras destacadas (SSG con revalidación).
- `AnimeDetail` → `/anime/[id]-[slug]` (slug compuesto, ver abajo).
- `FigureDetail` → `/figure/[id]-[slug]` — la página que más importa para SEO.
- `Navbar` en versión pública (sin menú Work, sin toggle de preferencias admin si no aplica).
- Preferencias de moneda/idioma (`preferences.tsx`) se portan.

**URLs (decidido 2026-07-18): slug compuesto** — el id numérico va embebido al inicio
(`/figure/482-miku-racing-2024`); Next extrae el id y consulta la API por id como siempre; el
resto del texto es decorativo para SEO. Sin cambios de backend y sin riesgo de colisión: los
ids nunca chocan, mientras que slugs derivados de nombres sí podrían.

Rendering: **SSG + ISR**. Para arrancar, revalidación **por tiempo** (cada N horas) — cero
integración. La revalidación **on-demand** (endpoint `/api/revalidate` con secret en Next +
llamada desde el admin al publicar cambios) queda como mejora opcional posterior. Las fichas
de figuras nuevas se generan a demanda en la primera visita (fallback dinámico); los listados
muestran lo del último build hasta la siguiente revalidación.
El catálogo cambia poco → no hace falta SSR por request.

Notas técnicas a contemplar desde el día uno:
- **Cold starts de Render (free tier)**: los fetch de build e ISR deben llevar timeout generoso
  (60s+) y reintentos — si el backend está dormido, la primera request tarda 30-50s y el build
  fallaría intermitentemente con los defaults.
- **CORS**: habilitar el dominio nuevo en el backend — lo gestiona Diego, fuera de este plan.
- **SEO fino** (sitemap.xml, robots.txt, canonical tags, transición desde GitHub Pages): se
  define más adelante; al lanzar el catálogo nuevo, eliminar pronto las rutas públicas viejas
  (paso 3) para no competir con contenido duplicado indexado.

**Hosting: Vercel** (primera opción, free tier sobra) o Cloudflare Pages.
GitHub Pages ya no sirve para esta parte (no ejecuta SSR/ISR).

Alternativas en AWS/GCP (válidas, más plataforma que administrar):
- **AWS Amplify Hosting** o **Firebase App Hosting** — equivalentes directos con soporte
  Next.js SSR/ISR, CDN, SSL y dominio custom. Elegir solo si se quiere aprender esa nube o
  se planea llevar ahí el backend; hoy no hay sinergia (backend en Render).
- S3+CloudFront / Cloud Run / App Runner — posibles pero armado manual u overkill.
- **Dominio**: independiente del hosting; comprar en Cloudflare Registrar (precio de costo),
  Namecheap, Route 53 o Cloud Domains y apuntarlo a cualquiera de los anteriores. SSL gratis
  en todos.

---

## 4. Admin — este repo, mismo stack, solo refactor

**No se cambia el stack.** Vite + React + TS + shadcn es exactamente lo correcto para un
back-office con auth: SPA, sin SEO, deploy estático barato. Cambiarlo sería costo sin beneficio.

Qué se hace en el split:
1. **Borrar** las páginas públicas (`Index`, `AnimeDetail`, `FigureDetail`) y sus componentes
   exclusivos una vez que el catálogo Next esté en producción.
2. `/` del admin pasa a ser un dashboard o redirect a `/work/figure`.

Refactors pendientes (deuda conocida, aprovechar el momento):
- **Unificar capa de datos**: 6 páginas admin usan `fetch` crudo (~29 llamadas): `FigurePage`
  (7), `CandidateReviewPage` (6), `CharacterAdminPages` (5), `FigureSourceListingPage` (5),
  `SourcePage` (3), `FranchisePage` (3); migrar todo a `apiRequest` (`src/lib/apiClient.ts`).
- **Adoptar TanStack Query de forma consistente** (ya está instalado; hoy solo `useFranchises`
  lo usa; el resto es `useState`+`useEffect` manual).
- **Partir páginas monolíticas**: `ScrapingRunnerPage` (~1.500 líneas, 15 componentes inline) y
  `CandidateReviewPage` son las peores; extraer componentes a `src/components/`.
- **Limpiar dependencias muertas**: `next-themes` (el dark mode es manual en `Navbar`),
  `recharts`, `embla-carousel`, `input-otp`, `vaul`, etc. — auditar y podar.
- **Centralizar fallbacks hardcodeados** de reference data (hoy duplicados por página).
- **Auth**: hoy el admin está abierto; al separarlo conviene meter el login. **Toda la
  seguridad vive en el backend** (Spring Security + OAuth2 resource server, hoy desactivado en
  dev): la API exige token válido en cada request. La SPA estática en Pages es públicamente
  descargable por naturaleza — decisión consciente, aceptable para un back-office.

---

## 5. Orden de ejecución sugerido

1. **Crear `figure-market-web` (Next)** y migrar el catálogo — valor visible rápido,
   el admin sigue funcionando intacto mientras tanto.
2. Apuntar dominio/hosting del catálogo (Vercel) y validar SEO (Search Console).
3. **Adelgazar este repo a admin puro**: borrar páginas públicas, redirect de `/`.
4. Refactor incremental del admin (lista de arriba), sin big-bang: página por página.
5. (Opcional, futuro) PWA/TWA del catálogo para tener app Android instalable.

---

## 6. Qué NO se hace

- No migrar a Flutter (decidido 2026-07-17).
- No tocar el backend por el split (misma API para ambos fronts).
- No reescribir el admin en Next ni ningún otro framework.
- No hacer el refactor del admin antes de separar (se haría dos veces).
