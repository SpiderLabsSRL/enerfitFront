import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from "date-fns";

export type DateFilterType = 'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'specific' | 'range';

interface DateFiltersProps {
  filterType: DateFilterType;
  onFilterTypeChange: (value: DateFilterType) => void;
  specificDate?: Date;
  onSpecificDateChange: (date: Date | undefined) => void;
  startDate?: Date;
  onStartDateChange: (date: Date | undefined) => void;
  endDate?: Date;
  onEndDateChange: (date: Date | undefined) => void;
}

export function DateFilters({
  filterType,
  onFilterTypeChange,
  specificDate,
  onSpecificDateChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange
}: DateFiltersProps) {
  
  // Función para manejar cambios en el tipo de filtro
  const handleFilterTypeChange = (value: DateFilterType) => {
    onFilterTypeChange(value);
    
    // Resetear fechas específicas/rango
    onSpecificDateChange(undefined);
    onStartDateChange(undefined);
    onEndDateChange(undefined);
  };

  return (
    <div className="flex flex-col gap-2">
      <Select value={filterType} onValueChange={handleFilterTypeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Seleccionar filtro" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoy</SelectItem>
          <SelectItem value="yesterday">Ayer</SelectItem>
          <SelectItem value="thisWeek">Esta semana</SelectItem>
          <SelectItem value="lastWeek">Semana pasada</SelectItem>
          <SelectItem value="thisMonth">Este mes</SelectItem>
          <SelectItem value="lastMonth">Mes pasado</SelectItem>
          <SelectItem value="specific">Fecha específica</SelectItem>
          <SelectItem value="range">Rango de fechas</SelectItem>
          <SelectItem value="all">Todos</SelectItem>
        </SelectContent>
      </Select>

      {filterType === 'specific' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[180px] justify-start text-left font-normal",
                !specificDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {specificDate ? format(specificDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={specificDate}
              onSelect={onSpecificDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}

      {filterType === 'range' && (
        <div className="flex flex-col gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP", { locale: es }) : <span>Fecha inicio</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={onStartDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP", { locale: es }) : <span>Fecha fin</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={onEndDateChange}
                initialFocus
                disabled={startDate ? { before: startDate } : undefined}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}