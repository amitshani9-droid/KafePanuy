interface BrandLogoProps {
  compact?: boolean
}

/** Map pin holding a steaming coffee cup, with a pulsing "live" dot. */
function LogoMark() {
  return (
    <div className="relative h-10 w-10 shrink-0">
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <path
          d="M24 3C14.6 3 7 10.4 7 19.6 7 31.8 24 45 24 45s17-13.2 17-25.4C41 10.4 33.4 3 24 3z"
          className="fill-forest"
        />
        {/* steam */}
        <g className="stroke-cream" strokeWidth="1.6" strokeLinecap="round" fill="none">
          <path d="M19 14c-1.2-1.4 1.2-2.6 0-4" className="animate-steam" />
          <path
            d="M23 14c-1.2-1.4 1.2-2.6 0-4"
            className="animate-steam"
            style={{ animationDelay: '0.6s' }}
          />
          <path
            d="M27 14c-1.2-1.4 1.2-2.6 0-4"
            className="animate-steam"
            style={{ animationDelay: '1.2s' }}
          />
        </g>
        {/* cup */}
        <path d="M15.5 17h15v6.5a7.5 7.5 0 0 1-15 0z" className="fill-cream" />
        <path
          d="M30.5 18.8h1.6a2.9 2.9 0 0 1 0 5.8h-2"
          fill="none"
          className="stroke-cream"
          strokeWidth="1.8"
        />
        <path d="M14 31.5h18" className="stroke-espresso" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="absolute -top-0.5 -left-0.5 flex h-3.5 w-3.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-calm animate-live-dot" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-cream bg-calm" />
      </span>
    </div>
  )
}

export default function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-tight">
        <div className="font-display text-xl font-bold text-forest">קפה פנוי</div>
        {!compact && (
          <div className="text-xs font-medium text-forest/70">הקפה שלך, בלי התור.</div>
        )}
      </div>
    </div>
  )
}
