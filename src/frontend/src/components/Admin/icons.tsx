import type { SVGProps } from 'react'

/**
 * Small hand-rolled stroke-icon set for the Modernist admin redesign (see
 * docs/design/CLAUDE_DESIGN_BRIEF.md / the Claude Design handoff extracted
 * to docs/design/). The handoff specified Lucide icons, but this sandbox
 * has no npm registry access to install `lucide-react` (or verify a build
 * with it) -- these are minimal equivalents in the same visual language
 * (24x24 viewBox, 2px stroke, round caps/joins) so the result looks the
 * same without a new dependency. Swapping to `lucide-react` later (if
 * wanted) is a mechanical one-for-one import replacement -- every icon here
 * is named after its Lucide counterpart.
 */
type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps) {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  }
}

export function ArrowLeft(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

export function Upload(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  )
}

export function RefreshCw(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5M3 21v-5h5" />
    </svg>
  )
}

export function Trash2(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

export function Gamepad2(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 12h4M8 10v4M15 13h.01M18 11h.01" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.95 3.41l-1.2 8A4 4 0 0 0 5.48 21a4 4 0 0 0 3.4-1.9l.9-1.45a2 2 0 0 1 1.7-.95h1.04a2 2 0 0 1 1.7.95l.9 1.45a4 4 0 0 0 3.4 1.9 4 4 0 0 0 3.95-4.59l-1.2-8A4 4 0 0 0 17.32 5Z" />
    </svg>
  )
}

export function Book(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  )
}

export function UserPlus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  )
}

export function Gift(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="8" width="18" height="4" />
      <path d="M12 8v13M19 12v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  )
}

export function Wallet(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5Z" />
      <path d="M21 12h-4a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )
}

export function Pencil(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="M15 5l4 4" />
    </svg>
  )
}

export function Plus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function X(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
