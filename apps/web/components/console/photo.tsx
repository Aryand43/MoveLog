import { cn } from "@/lib/utils";

/**
 * The demo ships no binary assets, so evidence photos are drawn. Every one is
 * captioned as an illustration, so a reviewer never mistakes it for a real
 * packer photo.
 */
export function EvidencePhoto({
  variant,
  caption,
  className,
}: {
  variant: "damaged" | "survey";
  caption: string;
  className?: string;
}) {
  const damaged = variant === "damaged";
  return (
    <figure className={cn("overflow-hidden rounded-lg border bg-slate-100", className)}>
      <div className="relative aspect-[4/3] w-full">
        <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label={caption}>
          <rect width="400" height="300" fill="#e7ecf2" />
          <rect x="40" y="230" width="320" height="12" rx="6" fill="#cbd5e1" />
          {/* body */}
          <rect x="110" y="60" width="180" height="170" rx="12" fill="#64748b" />
          <rect x="110" y="60" width="180" height="170" rx="12" fill="url(#sheen)" opacity="0.35" />
          {/* front panel */}
          <rect x="128" y="96" width="144" height="76" rx="8" fill="#94a3b8" />
          <circle cx="158" cy="134" r="13" fill="#475569" />
          <rect x="184" y="126" width="70" height="8" rx="4" fill="#475569" />
          <rect x="184" y="142" width="46" height="8" rx="4" fill="#64748b" />
          {/* spout + cup */}
          <rect x="176" y="178" width="48" height="10" rx="5" fill="#475569" />
          <rect x="180" y="196" width="40" height="26" rx="5" fill="#f8fafc" />
          {damaged && (
            <>
              <path
                d="M142 158 l26 -9 -6 12 30 -12"
                stroke="#dc2626"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="170" cy="152" r="34" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="6 5" />
            </>
          )}
          <defs>
            <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#0f1e33" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute bottom-2 left-2 rounded bg-slate-900/75 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
          Illustration
        </span>
      </div>
      <figcaption className="border-t bg-card px-3 py-2 text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}
