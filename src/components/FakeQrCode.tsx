interface FakeQrCodeProps {
  value: string
  size?: number
}

const GRID = 25

/** Deterministic QR-looking pattern for a simulated coupon (not a scannable QR). */
export default function FakeQrCode({ value, size = 180 }: FakeQrCodeProps) {
  // Seeded PRNG (mulberry32) from a string hash, so a code always draws the same pattern
  let seed = [...value].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261)
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= GRID - 8 && y < 8) || (x < 8 && y >= GRID - 8)

  let modules = ''
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!inFinder(x, y) && rand() > 0.52) modules += `M${x} ${y}h1v1h-1z`
    }
  }

  const finder = (x: number, y: number) => `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`

  return (
    <svg
      viewBox={`-1 -1 ${GRID + 2} ${GRID + 2}`}
      width={size}
      height={size}
      role="img"
      aria-label={`קוד קופון ${value}`}
      shapeRendering="crispEdges"
      className="rounded-lg bg-white"
    >
      <path d={modules} className="fill-forest" />
      <path d={finder(0, 0) + finder(GRID - 7, 0) + finder(0, GRID - 7)} className="fill-forest" fillRule="evenodd" />
    </svg>
  )
}
