'use client'

import type { OsEvent } from '@/lib/types'

// Design tokens matching dev-fleet.tsx
const T = {
  bg: '#222222',
  line: '#3d3d3d',
  muted: '#b0b0b0',
  faint: '#727272',
}

/**
 * Inline detail panel for a service order — shows the full description and the
 * AI reasoning side by side (stacks on narrow screens). Used wherever an OS row
 * can be expanded in place (OS tab, moto rows, part cards).
 */
export function OsDetailGrid({ event }: { event: OsEvent }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg p-3" style={{ backgroundColor: T.bg, border: `1px solid ${T.line}` }}>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: T.faint }}>
          Descrição completa
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: T.muted }}>
          {event.os_description ?? <span style={{ color: T.faint }}>—</span>}
        </p>
      </div>
      <div className="rounded-lg p-3" style={{ backgroundColor: T.bg, border: `1px solid ${T.line}` }}>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: T.faint }}>
          Razão IA
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: T.muted }}>
          {event.ai_reason ?? <span style={{ color: T.faint }}>—</span>}
        </p>
      </div>
    </div>
  )
}
