'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { PartData, Moto } from '@/lib/types'
import { formatNumber, formatDate, validateKm } from '@/lib/data'
import { OsDetailGrid } from './os-detail'

// Design tokens matching dev-fleet.tsx
const T = {
  bg:           '#222222',
  surface:      '#2a2a2a',
  surface2:     '#323232',
  line:         '#3d3d3d',
  lineStrong:   '#4d4d4d',
  ink:          '#f0f0f0',
  muted:        '#b0b0b0',
  faint:        '#727272',
  warnBg:       '#231f00',
  warnBorder:   '#4a3d00',
  warnText:     '#d4a017',
  dangerBg:     '#2a0d0d',
  dangerBorder: '#5a1a1a',
  dangerText:   '#ff6b6b',
}

interface PartCardProps {
  part: PartData
  motoMap: Record<string, Moto>
}

export function PartCard({ part, motoMap }: PartCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [openOs, setOpenOs] = useState<Set<string>>(new Set())

  const toggleOs = (id: string) =>
    setOpenOs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const sortedOsEvents = [...part.os_events].sort((a, b) => (a.km_at_event ?? 0) - (b.km_at_event ?? 0))

  return (
    <div
      className="mb-2 overflow-hidden rounded-xl transition-colors"
      style={{
        border: `1px solid ${T.line}`,
        borderLeft: `3px solid ${part.color}`,
        backgroundColor: T.surface,
        boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 6px 20px -10px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors"
        style={{ backgroundColor: expanded ? T.surface2 : undefined }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold" style={{ color: T.ink }}>{part.name}</div>
          <div className="mt-0.5 font-mono text-[10px]" style={{ color: T.faint }}>{part.key}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {part.os_events.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: T.dangerBg, color: T.dangerText, border: `1px solid ${T.dangerBorder}` }}
            >
              {part.os_events.length} OS
            </span>
          )}
          {part.error_motos.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: T.warnBg, color: T.warnText, border: `1px solid ${T.warnBorder}` }}
            >
              {part.error_motos.length} erro{part.error_motos.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[11px]" style={{ color: T.faint }}>{part.valid_motos.length} motos</span>
          <div className="min-w-[80px] text-right text-[15px] font-semibold tabular-nums" style={{ color: part.color }}>
            +{formatNumber(part.total_km)} km
          </div>
          {expanded
            ? <ChevronUp className="h-3.5 w-3.5" style={{ color: T.faint }} />
            : <ChevronDown className="h-3.5 w-3.5" style={{ color: T.faint }} />
          }
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${T.line}` }} className="px-4 py-3">
          {/* Stats grid */}
          <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            <StatCell label="km médio / moto" value={formatNumber(part.avg_km)} />
            {part.valid_motos.length > 1 && (
              <StatCell label="range" value={`${formatNumber(part.min_km)}–${formatNumber(part.max_km)}`} />
            )}
            <StatCell label="motos válidas" value={part.valid_motos.length} />
            {part.os_rate > 0 && (
              <StatCell label="OS / 1k km" value={part.os_rate} accent={T.dangerText} />
            )}
            {part.error_motos.length > 0 && (
              <StatCell label="c/ erro" value={part.error_motos.length} accent={T.warnText} />
            )}
            {part.km_breakdown.reset > 0 && (
              <StatCell label="odôm. reiniciado" value={part.km_breakdown.reset} accent={T.dangerText} />
            )}
          </div>

          {/* OS list */}
          {part.os_events.length > 0 ? (
            <>
              <div
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: T.faint }}
              >
                Ordens de serviço — clique para ver detalhes
              </div>
              {sortedOsEvents.map((e) => {
                const moto = motoMap[e.license_plate]
                const err = moto ? validateKm(moto) : null
                const kmSinceInstall = moto && !err ? (e.km_at_event ?? 0) - (moto.km_at_install ?? 0) : null
                const isOpen = openOs.has(e.os_id)

                return (
                  <div key={e.os_id}>
                    <div
                      onClick={() => toggleOs(e.os_id)}
                      className="flex cursor-pointer flex-wrap items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] transition-colors"
                      style={{ backgroundColor: isOpen ? T.surface2 : 'transparent' }}
                      onMouseEnter={(ev) => (ev.currentTarget.style.backgroundColor = T.surface2)}
                      onMouseLeave={(ev) => (ev.currentTarget.style.backgroundColor = isOpen ? T.surface2 : 'transparent')}
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: T.dangerText }} />
                      <span className="min-w-[54px] font-mono" style={{ color: T.dangerText }}>#{e.os_id}</span>
                      <span className="min-w-[72px] font-mono text-[10px]" style={{ color: T.faint }}>{e.license_plate}</span>
                      <span className="tabular-nums" style={{ color: T.muted }}>{formatNumber(e.km_at_event)} km</span>
                      {kmSinceInstall != null && (
                        <span style={{ color: T.faint }}>+{formatNumber(kmSinceInstall)} desde inst.</span>
                      )}
                      {e.os_description && (
                        <span className="truncate" style={{ color: T.faint }}>{e.os_description}</span>
                      )}
                      <span className="ml-auto shrink-0" style={{ color: T.faint }}>{formatDate(e.os_date)}</span>
                      <span className="shrink-0" style={{ color: T.faint }}>
                        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </span>
                    </div>
                    {isOpen && (
                      <div className="px-2 pb-2 pt-1.5">
                        <OsDetailGrid event={e} />
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          ) : (
            <p className="py-4 text-center text-[12px]" style={{ color: T.faint }}>Nenhuma OS registrada.</p>
          )}
        </div>
      )}
    </div>
  )
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div className="rounded-lg px-2.5 py-2" style={{ backgroundColor: T.bg, border: `1px solid ${T.line}` }}>
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: T.faint }}
      >
        {label}
      </div>
      <div className="mt-0.5 text-[13px] font-semibold tabular-nums" style={{ color: accent ?? T.muted }}>
        {value}
      </div>
    </div>
  )
}
