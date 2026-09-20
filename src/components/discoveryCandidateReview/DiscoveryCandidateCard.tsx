import { ExternalLink, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/date";
import type { FigureDiscoveryCandidate } from "@/types/discoveryCandidate";

const FALLBACK_IMAGE_URL = `${import.meta.env.BASE_URL}placeholder.svg`;

const FIGURE_DETAIL_BASE_URL = `${import.meta.env.BASE_URL}figure`;

const statusBadgeVariant: Record<FigureDiscoveryCandidate["status"], "secondary" | "default" | "outline"> = {
  PENDING_REVIEW: "secondary",
  CONFIRMED_DUPLICATE: "outline",
  CONFIRMED_NEW: "default",
};

const statusLabel: Record<FigureDiscoveryCandidate["status"], string> = {
  PENDING_REVIEW: "Pendiente de revisión",
  CONFIRMED_DUPLICATE: "Confirmado: duplicado",
  CONFIRMED_NEW: "Confirmado: figura nueva",
};

type DiscoveryCandidateCardProps = {
  candidate: FigureDiscoveryCandidate;
  onConfirmDuplicate: (candidate: FigureDiscoveryCandidate) => void;
  onConfirmNew: (candidate: FigureDiscoveryCandidate) => void;
};

const DiscoveryCandidateCard = ({
  candidate,
  onConfirmDuplicate,
  onConfirmNew,
}: DiscoveryCandidateCardProps) => {
  const imageUrl = candidate.mainImageUrl || candidate.thumbnailUrl || FALLBACK_IMAGE_URL;
  const matchReasons = candidate.matchReasons
    ? candidate.matchReasons.split(";").map((reason) => reason.trim()).filter(Boolean)
    : [];
  const isPending = candidate.status === "PENDING_REVIEW";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusBadgeVariant[candidate.status]}>{statusLabel[candidate.status]}</Badge>
          <span className="text-xs text-muted-foreground">
            {candidate.franchiseName} · {candidate.sourceCode}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Capturado {formatDateTime(candidate.capturedAt)}
          {candidate.reviewedAt && <> · Revisado {formatDateTime(candidate.reviewedAt)}</>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Encontrado en la fuente
            </p>
            <div className="flex gap-3">
              <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                <img
                  src={imageUrl}
                  alt={candidate.sourceTitle}
                  className="h-full w-full object-contain"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_IMAGE_URL;
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-foreground">{candidate.sourceTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {candidate.price ? `${candidate.price} ${candidate.currencyCode || ""}` : "Precio no informado"}
                </p>
                {candidate.availabilityText && (
                  <p className="text-xs text-muted-foreground">{candidate.availabilityText}</p>
                )}
                {candidate.sourceUrl && (
                  <a
                    href={candidate.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Ver en la fuente
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {candidate.productCode && (
                <div>
                  <dt className="inline font-medium text-foreground">Código: </dt>
                  <dd className="inline">{candidate.productCode}</dd>
                </div>
              )}
              {candidate.janCode && (
                <div>
                  <dt className="inline font-medium text-foreground">JAN: </dt>
                  <dd className="inline">{candidate.janCode}</dd>
                </div>
              )}
              {candidate.lineName && (
                <div>
                  <dt className="inline font-medium text-foreground">Línea: </dt>
                  <dd className="inline">{candidate.lineName}</dd>
                </div>
              )}
              {candidate.material && (
                <div>
                  <dt className="inline font-medium text-foreground">Material: </dt>
                  <dd className="inline">{candidate.material}</dd>
                </div>
              )}
              {candidate.editionSize !== null && candidate.editionSize !== undefined && (
                <div>
                  <dt className="inline font-medium text-foreground">Edición: </dt>
                  <dd className="inline">{candidate.editionSize}</dd>
                </div>
              )}
              <div>
                <dt className="inline font-medium text-foreground">Marca si es nueva: </dt>
                <dd className="inline">{candidate.brandName}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Figura sospechada en el catálogo
            </p>
            {candidate.possibleDuplicateFigureId ? (
              <div>
                <a
                  href={`${FIGURE_DETAIL_BASE_URL}/${candidate.possibleDuplicateFigureId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {candidate.possibleDuplicateFigureName || `Figura ${candidate.possibleDuplicateFigureId}`}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {candidate.possibleDuplicateFigureSlug && (
                  <p className="text-xs text-muted-foreground">{candidate.possibleDuplicateFigureSlug}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ninguna figura similar encontrada en el catálogo.</p>
            )}

            {candidate.status === "CONFIRMED_NEW" && candidate.resultingFigureId && (
              <div className="mt-3 border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Figura creada
                </p>
                <a
                  href={`${FIGURE_DETAIL_BASE_URL}/${candidate.resultingFigureId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Ver figura #{candidate.resultingFigureId}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-dashed p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5" />
            Por qué el sistema lo marcó (no es la decisión final)
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Match score: <span className="font-medium text-foreground">{candidate.matchScore.toFixed(2)}</span>
          </p>
          {matchReasons.length > 0 && (
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
              {matchReasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          )}
        </div>

        {isPending ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onConfirmDuplicate(candidate)}>
              Es la misma figura
            </Button>
            <Button type="button" onClick={() => onConfirmNew(candidate)}>
              Es una figura nueva
            </Button>
          </div>
        ) : (
          candidate.reviewNotes && (
            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Notas de revisión: </span>
              {candidate.reviewNotes}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default DiscoveryCandidateCard;
