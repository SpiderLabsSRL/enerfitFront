import { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  align?: "left" | "right";
}

export function TimePicker({ value, onChange, className, placeholder = "--:--", align = "left" }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number>(() => {
    if (value) {
      const [hour] = value.split(":");
      const h = parseInt(hour);
      return h % 12 === 0 ? 12 : h % 12;
    }
    return 9;
  });
  const [selectedMinute, setSelectedMinute] = useState<number>(() => {
    if (value) {
      const [, minute] = value.split(":");
      return parseInt(minute);
    }
    return 0;
  });
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(() => {
    if (value) {
      const [hour] = value.split(":");
      const h = parseInt(hour);
      return h >= 12 ? "PM" : "AM";
    }
    return "AM";
  });
  
  const pickerRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDisplayValue = () => {
    if (!value) return "";
    const [hour, minute] = value.split(":");
    const h = parseInt(hour);
    const period = h >= 12 ? "PM" : "AM";
    let displayHour = h % 12;
    if (displayHour === 0) displayHour = 12;
    return `${displayHour}:${minute} ${period}`;
  };

  const handleTimeSelect = () => {
    let hour24 = selectedHour;
    if (selectedPeriod === "PM" && selectedHour !== 12) hour24 = selectedHour + 12;
    if (selectedPeriod === "AM" && selectedHour === 12) hour24 = 0;
    const timeString = `${hour24.toString().padStart(2, "0")}:${selectedMinute.toString().padStart(2, "0")}`;
    onChange(timeString);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <div
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground cursor-pointer",
          "hover:border-primary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30",
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={!value ? "text-muted-foreground opacity-70" : ""}>
          {formatDisplayValue() || placeholder}
        </span>
        <Clock className="h-4 w-4 text-primary" />
      </div>

      {isOpen && (
        <div 
          className={cn(
            "absolute z-50 mt-1 w-[320px] rounded-md border border-border bg-card shadow-lg",
            align === "left" ? "left-0" : "right-0"
          )}
        >
          <div className="p-3">
            <div className="grid grid-cols-3 gap-3">
              {/* Horas */}
              <div className="space-y-2">
                <div className="text-center text-xs font-medium text-muted-foreground">Hora</div>
                <div className="h-48 overflow-y-auto scrollbar-hide space-y-1">
                  {hours.map((hour) => (
                    <button
                      key={hour}
                      onClick={() => setSelectedHour(hour)}
                      className={cn(
                        "w-full rounded-md px-2 py-1.5 text-center text-sm transition-colors",
                        selectedHour === hour
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-primary/20 text-foreground"
                      )}
                    >
                      {hour.toString().padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutos */}
              <div className="space-y-2">
                <div className="text-center text-xs font-medium text-muted-foreground">Min</div>
                <div className="h-48 overflow-y-auto scrollbar-hide space-y-1">
                  {minutes.map((minute) => (
                    <button
                      key={minute}
                      onClick={() => setSelectedMinute(parseInt(minute))}
                      className={cn(
                        "w-full rounded-md px-2 py-1.5 text-center text-sm transition-colors",
                        selectedMinute === parseInt(minute)
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-primary/20 text-foreground"
                      )}
                    >
                      {minute}
                    </button>
                  ))}
                </div>
              </div>

              {/* AM/PM */}
              <div className="space-y-2">
                <div className="text-center text-xs font-medium text-muted-foreground"></div>
                <div className="space-y-2 pt-0">
                  <button
                    onClick={() => setSelectedPeriod("AM")}
                    className={cn(
                      "w-full rounded-md px-2 py-3 text-center text-sm transition-colors",
                      selectedPeriod === "AM"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-primary/20 text-foreground"
                    )}
                  >
                    AM
                  </button>
                  <button
                    onClick={() => setSelectedPeriod("PM")}
                    className={cn(
                      "w-full rounded-md px-2 py-3 text-center text-sm transition-colors",
                      selectedPeriod === "PM"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-primary/20 text-foreground"
                    )}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleTimeSelect}
                className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Aceptar
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}