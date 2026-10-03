import { useState } from "react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { format, parseISO, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toIsoDate } from "@/lib/date";
import type { DateRange } from "@/types/stats";

export type RangePreset = "7" | "30" | "90" | "custom";

export type DashboardRange = DateRange & { preset: RangePreset };

export function presetRange(days: number): DateRange {
  const today = new Date();
  return { from: toIsoDate(subDays(today, days - 1)), to: toIsoDate(today) };
}

export function isValidRange(range: DateRange) {
  return Boolean(range.from && range.to && range.from <= range.to);
}

const formatLabel = (value: string) => format(parseISO(value), "d MMM yyyy", { locale: es });

type DateRangeSelectorProps = {
  value: DashboardRange;
  onChange: (value: DashboardRange) => void;
};

const DateRangeSelector = ({ value, onChange }: DateRangeSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayPickerRange | undefined>();

  const selectPreset = (preset: string) => {
    // "custom" lo maneja el Popover; un valor vacío es el deselect del toggle.
    if (!preset || preset === "custom") return;
    onChange({ ...presetRange(Number(preset)), preset: preset as RangePreset });
  };

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft({ from: parseISO(value.from), to: parseISO(value.to) });
    setOpen(next);
  };

  const applyCustom = () => {
    if (!draft?.from) return;
    const from = toIsoDate(draft.from);
    const to = toIsoDate(draft.to ?? draft.from);
    onChange({ from, to, preset: "custom" });
    setOpen(false);
  };

  const draftInvalid = !draft?.from || (draft.to !== undefined && draft.from > draft.to);

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="flex-wrap justify-start"
          value={value.preset}
          onValueChange={selectPreset}
          aria-label="Rango de fechas"
        >
          <ToggleGroupItem value="7">7 días</ToggleGroupItem>
          <ToggleGroupItem value="30">30 días</ToggleGroupItem>
          <ToggleGroupItem value="90">90 días</ToggleGroupItem>
          <PopoverTrigger asChild>
            <ToggleGroupItem value="custom" className="gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              Personalizado
            </ToggleGroupItem>
          </PopoverTrigger>
        </ToggleGroup>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={draft}
            onSelect={setDraft}
            numberOfMonths={1}
            defaultMonth={draft?.from}
            disabled={{ after: new Date() }}
            locale={es}
            initialFocus
          />
          <div className="flex items-center justify-end gap-2 border-t p-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" disabled={draftInvalid} onClick={applyCustom}>
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        {formatLabel(value.from)} – {formatLabel(value.to)}
      </p>
    </div>
  );
};

export default DateRangeSelector;
