import { cn } from '@/lib/utils'

interface LogoMarkProps {
  className?: string
  size?: number
}

/**
 * The LeadMaster logo mark — a mint-green toggle switch with a checkmark,
 * recreated as pure SVG so it stays perfectly crisp at any size (navbar,
 * favicon, footer, etc.) instead of a raster PNG that blurs when scaled.
 */
export function LogoMark({ className, size = 28 }: LogoMarkProps) {
  const h = size
  const w = size * 1.7
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 68 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="68" height="40" rx="20" fill="#6EE7B7" />
      <circle cx="48" cy="20" r="17" fill="#0A0A0A" />
      <path
        d="M40 20.5L45 25.5L56 14.5"
        stroke="#FFFDF7"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface LogoProps {
  className?: string
  markSize?: number
  showWordmark?: boolean
  wordmarkClassName?: string
}

/** Full lockup: mark + "leadmaster" wordmark, used in navbars/headers/footers */
export function Logo({ className, markSize = 24, showWordmark = true, wordmarkClassName }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={markSize} />
      {showWordmark && (
        <span
          className={cn('font-extrabold tracking-tight lowercase', wordmarkClassName)}
          style={{ letterSpacing: '-0.5px' }}
        >
          leadmaster
        </span>
      )}
    </span>
  )
}
