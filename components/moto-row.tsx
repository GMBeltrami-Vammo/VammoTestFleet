'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import type { ProcessedMoto, OsEvent } from '@/lib/types'
import { formatNumber, formatDate, displayParts } from '@/lib/data'
import { KmBar } from './km-bar'
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

interface MotoRowProps {
  moto: ProcessedMoto
  rank: number
  osEvents: OsEvent[]
  expanded: boolean
  onToggle: () => void
  color: string
}

export function MotoRow({ moto, rank, osEvents, expanded, onToggle, color }: MotoRowProps) {
  const kmSince = moto.kmError ? null : moto.km_current! - moto.km_at_install!
  const [openOs, setOpenOs] = useState<Set<string>>(new Set())

  const toggleOs = (id: string) =>
    setOpenOs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div
      className="mb-1.5 cursor-pointer overflow-hidden rounded-xl transition-colors"
      style={{
        border: `1px solid ${T.line}`,
        borderLeft: `3px solid ${color}`,
        backgroundColor: expanded ? T.surface2 : T.surface,
        boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 6px 20px -10px rgba(0,0,0,0.5)',
      }}
      onMouseEnter={(ev) => { if (!expanded) (ev.currentTarget as HTMLElement).style.backgroundColor = T.surface2 }}
      onMouseLeave={(ev) => { if (!expanded) (ev.currentTarget as HTMLElement).style.backgroundColor = T.surface }}
      onClick={onToggle}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="min-w-[20px] text-right text-[11px] tabular-nums" style={{ color: T.faint }}>
          {rank}
        </span>
        <span className="min-w-[76px] font-mono text-[13px] font-semibold tracking-wider" style={{ color: T.ink }}>
          {moto.license_plate}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: T.muted }}>
          {displayParts(moto.dev_parts_on_bike)}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {osEvents.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: T.dangerBg, color: T.dangerText, border: `1px solid ${T.dangerBorder}` }}
            >
              {osEvents.length} OS
            </span>
          )}
          {moto.kmStatus.isError && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: T.warnBg, color: T.warnText, border: `1px solid ${T.warnBorder}` }}
            >
              erro
            </span>
          )}
          <span style={{ color: T.faint }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        </div>
      </div>

      {/* KM bar or error */}
      <div className="px-3 pb-2.5">
        {moto.kmStatus.isError ? (
          <div
            className="flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px]"
            style={
              moto.kmStatus.category === 'reset'
                ? { backgroundColor: T.dangerBg, color: T.dangerText, border: `1px solid ${T.dangerBorder}` }
                : { backgroundColor: T.warnBg, color: T.warnText, border: `1px solid ${T.warnBorder}` }
            }
          >
            {moto.kmStatus.category === 'reset'
              ? <RotateCcw size={13} />
              : <AlertTriangle size={13} />
            }
            <strong>{moto.kmStatus.category === 'reset' ? 'Odômetro reiniciado' : 'Erro de KM'}</strong>
            <span className="opacity-70">— {moto.kmStatus.label}</span>
            {moto.km_at_install != null && moto.km_current != null && (
              <span className="ml-auto tabular-nums">
                {formatNumber(moto.km_at_install)} → {formatNumber(moto.km_current)} km
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="min-w-[20px]" />
            <div className="flex-1">
              <KmBar
                kmAtInstall={moto.km_at_install!}
                kmCurrent={moto.km_current!}
                osEvents={osEvents}
                color={color}
              />
            </div>
            <div className="flex shrink-0 gap-4">
              <div className="text-right">
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: T.faint }}
                >
                  instalação
                </div>
                <div className="text-[12px] tabular-nums" style={{ color: T.muted }}>
                  {formatNumber(moto.km_at_install)}
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: T.faint }}
                >
                  atual
                </div>
                <div className="text-[12px] tabular-nums" style={{ color: T.muted }}>
                  {formatNumber(moto.km_current)}
                </div>
              </div>
              <div className="min-w-[68px] text-right">
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: T.faint }}
                >
                  desde peça
                </div>
                <div className="text-[13px] font-semibold tabular-nums" style={{ color }}>
                  +{formatNumber(kmSince)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded OS section */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${T.line}` }} className="px-3 pb-3 pt-2.5">
          {osEvents.length > 0 ? (
            <>
              <div
                className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: T.faint }}
              >
                Ordens de Serviço
              </div>
              {[...osEvents]
                .sort((a, b) => (a.km_at_event ?? 0) - (b.km_at_event ?? 0))
                .map((e) => {
                  const isOpen = openOs.has(e.os_id)
                  return (
                    <div key={e.os_id}>
                      <div
                        onClick={(ev) => {
                          ev.stopPropagation()
                          toggleOs(e.os_id)
                        }}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-[12px] transition-colors"
                        style={{ backgroundColor: isOpen ? T.lineStrong : 'transparent' }}
                        onMouseEnter={(ev) => (ev.currentTarget.style.backgroundColor = T.lineStrong)}
                        onMouseLeave={(ev) => (ev.currentTarget.style.backgroundColor = isOpen ? T.lineStrong : 'transparent')}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: T.dangerText }} />
                        <span className="min-w-[60px] font-mono" style={{ color: T.dangerText }}>#{e.os_id}</span>
                        <span className="tabular-nums" style={{ color: T.muted }}>{formatNumber(e.km_at_event)} km</span>
                        {!moto.kmError && e.km_at_event != null && (
                          <span style={{ color: T.faint }}>
                            +{formatNumber(e.km_at_event - moto.km_at_install!)} desde instalação
                          </span>
                        )}
                        {e.os_description && (
                          <span className="ml-2 truncate" style={{ color: T.faint }}>{e.os_description}</span>
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
