# Milo Front Admin

Frontend administrativo y de consulta para gestionar figuras, franquicias, sources, aliases, listings y candidatos provenientes de scraping.

## Stack

- React + Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- GitHub Pages para despliegue

## Backend

El frontend consume el backend configurado en:

```env
VITE_API_BASE_URL=https://figure-market-core.onrender.com/api
```

Si no existe esa variable de entorno, el frontend usa esa URL por defecto.

## Rutas Principales

### Work

El menu `Work` contiene los CRUDs principales:

- `/work/figure`
  Gestiona figuras.
- `/work/figure-alias`
  Gestiona aliases asociados a figuras.
- `/work/figure-source-listing`
  Gestiona listings finales por figura y source.
- `/work/franchises`
  Gestiona franquicias.
- `/work/sources`
  Gestiona sources.

### FigureAdmin

El menu `FigureAdmin` contiene flujos administrativos relacionados con scraping:

- `/figure-admin/candidate-review`
  Revisa candidates generados por scraping antes de aprobarlos como listings finales.

## Candidate Review

La pantalla `Candidate Review` consume:

```text
GET    /api/v1/scraping/candidates
POST   /api/v1/scraping/candidates
PUT    /api/v1/scraping/candidates/{id}
POST   /api/v1/scraping/candidates/{id}/approve
POST   /api/v1/scraping/candidates/{id}/reject
DELETE /api/v1/scraping/candidates/{id}
```

Comportamiento actual:

- La tabla muestra candidates scrapeados.
- La accion `View` abre el modal en modo lectura.
- En candidates existentes solo se puede editar `Review Notes`.
- `Reviewed At` se bloquea en UI y se actualiza automaticamente al guardar la revision.
- `Approve` llama al backend y crea o actualiza el `Figure Source Listing` correspondiente.
- `Reject` marca el candidate como rechazado.
- `Delete` elimina el candidate previa confirmacion.

Campos como disponibilidad, precio, match score y datos scrapeados se muestran como referencia y no se editan desde review.

## Reference Data

Los enums se obtienen desde:

```text
GET /api/v1/reference-data
```

Actualmente se usan para:

- Currency codes
- Figure statuses
- Figure source listing statuses
- Load methods
- Source priorities
- Source types
- Scraped listing candidate statuses
- Match decisions

## Scripts

Instalar dependencias:

```bash
npm install
```

Levantar desarrollo local:

```bash
npm run dev
```

Build de produccion:

```bash
npm run build
```

Deploy a GitHub Pages:

```bash
npm run deploy
```

Nota: en este entorno Windows, el build/deploy ha funcionado de forma mas estable ejecutandolo desde `cmd`:

```bash
cmd /c npm run deploy
```

## GitHub Pages

El deploy publica el contenido compilado de `dist` en la rama `gh-pages`.

La web publica queda disponible en:

```text
https://diegodzacarias.github.io/milo-front-admin/
```

El codigo fuente puede vivir en ramas como `main` o ramas de trabajo, pero la pagina publicada depende del ultimo deploy enviado a `gh-pages`.
