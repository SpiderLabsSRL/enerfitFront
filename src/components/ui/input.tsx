import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md border px-3 py-2 text-base",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          // Estados
          "disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          // Responsive
          "md:text-sm",
          // Estilos específicos por tipo
          type === "number" && [
            // Eliminar spinners y color azul por defecto
            "[&::-webkit-inner-spin-button]:appearance-none",
            "[&::-webkit-outer-spin-button]:appearance-none",
            "[-moz-appearance:textfield]",
            // Forzar colores del tema en todos los estados
            "bg-input",
            "border-border",
            "text-foreground",
            "hover:bg-input",
            "hover:border-border",
            "focus:bg-input",
            "focus:border-primary",
            "active:bg-input",
            "active:border-primary",
          ],
          type === "time" && [
            "[color-scheme:dark]",
            "bg-input",
            "border-border", 
            "text-foreground",
            "hover:bg-input",
            "hover:border-border",
            "focus:bg-input",
            "focus:border-primary",
          ],
          type !== "number" && type !== "time" && [
            "bg-input",
            "border-border",
            "text-foreground",
            "hover:bg-input",
            "hover:border-border",
            "focus:bg-input", 
            "focus:border-primary",
          ],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }