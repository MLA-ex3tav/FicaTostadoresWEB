import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRODUCT_COLORS,
  SIN_COLOR_ID,
  SIN_COLOR_LABEL,
  isSinColor,
  getProductColorById,
} from "@/lib/product-colors";

interface ProductColorPickerProps {
  value: string;
  onChange: (colorId: string) => void;
  disableColors?: boolean;
  disabledColors?: string[];
  className?: string;
}

export default function ProductColorPicker({
  value,
  onChange,
  disableColors = false,
  disabledColors = [],
  className,
}: ProductColorPickerProps) {
  const selected = getProductColorById(value);

  const selectedName = isSinColor(value)
    ? SIN_COLOR_LABEL
    : selected && !disabledColors.includes(selected.id)
      ? selected.name
      : "Seleccione un acabado";

  const availableColors = disableColors ? [] : PRODUCT_COLORS;

  if (disableColors) {
    return null;
  }

  return (
    <div className={cn("space-y-3.5", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
        <p className="text-xs font-semibold   text-steel-light">
          Acabado / Color
        </p>
        <span className="text-xs font-semibold text-white flex items-center gap-1.5 min-w-0 max-w-[65%] justify-end">
          {!isSinColor(value) && selected ? (
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0 border border-white/30"
              style={{ backgroundColor: selected.hex }}
            />
          ) : isSinColor(value) ? (
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0 border border-white/30"
              style={{
                background:
                  "linear-gradient(135deg, #64748b 46%, #ef4444 46%, #ef4444 54%, #64748b 54%)",
              }}
            />
          ) : null}
          <span className="truncate">{selectedName}</span>
        </span>
      </div>

      <div
        className="flex flex-wrap items-center gap-2.5 pt-0.5"
        role="radiogroup"
        aria-label="Color del equipo"
      >
        {availableColors.map((color) => {
          const isBlocked = disabledColors.includes(color.id);
          const isSelected = value === color.id && !isBlocked;
          const isLight =
            color.id === "blanco" ||
            color.id === "amarillo" ||
            color.id === "verde-claro";

          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isBlocked}
              disabled={isBlocked}
              aria-label={isBlocked ? `${color.name} (No disponible)` : color.name}
              title={isBlocked ? `${color.name} (No disponible para este producto)` : color.name}
              onClick={() => {
                if (!isBlocked) {
                  onChange(color.id);
                }
              }}
              className={cn(
                "group relative h-11 w-11 shrink-0 rounded-full transition-all focus:outline-none sm:h-8 sm:w-8",
                isBlocked
                  ? "opacity-25 cursor-not-allowed"
                  : isSelected
                    ? "ring-2 ring-orange ring-offset-2 ring-offset-[#16181c] scale-110 shadow-lg shadow-orange/25"
                    : "hover:scale-110 hover:ring-2 hover:ring-white/40 hover:ring-offset-1 hover:ring-offset-[#16181c] active:scale-95",
              )}
            >
              <span
                className={cn(
                  "block h-full w-full rounded-full border shadow-inner transition-transform",
                  isLight ? "border-black/25" : "border-white/20",
                )}
                style={{ backgroundColor: color.hex }}
              />
              {isBlocked && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Lock className="h-3 w-3 text-red-400 drop-shadow" />
                </span>
              )}
            </button>
          );
        })}

        {/* Sin color option */}
        <button
          type="button"
          role="radio"
          aria-checked={isSinColor(value)}
          aria-label={SIN_COLOR_LABEL}
          title={SIN_COLOR_LABEL}
          onClick={() => onChange(SIN_COLOR_ID)}
          className={cn(
            "group relative h-11 w-11 shrink-0 rounded-full transition-all focus:outline-none sm:h-8 sm:w-8",
            isSinColor(value)
              ? "ring-2 ring-orange ring-offset-2 ring-offset-[#16181c] scale-110 shadow-lg shadow-orange/25"
              : "hover:scale-110 hover:ring-2 hover:ring-white/40 hover:ring-offset-1 hover:ring-offset-[#16181c] active:scale-95",
          )}
        >
          <span
            className="block h-full w-full rounded-full border border-white/20 shadow-inner"
            style={{
              background:
                "linear-gradient(135deg, #1e293b 46%, #ef4444 46%, #ef4444 54%, #1e293b 54%)",
            }}
          />
        </button>
      </div>

    </div>
  );
}
