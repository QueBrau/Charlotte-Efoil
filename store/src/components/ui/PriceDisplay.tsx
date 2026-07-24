import { formatMoney } from "@/lib/format";

interface PriceDisplayProps {
  cents: number;
  compareAtCents?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
};

export function PriceDisplay({
  cents,
  compareAtCents,
  size = "md",
  className = "",
}: PriceDisplayProps) {
  return (
    <div className={`price-display flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className={`font-medium text-brand ${sizeClasses[size]}`}>
        {formatMoney(cents)}
      </span>
      {compareAtCents && compareAtCents > cents ? (
        <span className="text-sm text-brand-muted line-through">
          {formatMoney(compareAtCents)}
        </span>
      ) : null}
    </div>
  );
}
