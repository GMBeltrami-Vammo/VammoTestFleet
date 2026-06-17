'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { PartData, Moto, OsEvent } from '@/lib/types'
import { formatNumber, formatDate, validateKm } from '@/lib/data'

interface PartCardProps {
  part: PartData
  motoMap: Record<string, Moto>
  onOsClick: (osId: string, partKey: string) => void
}

export function PartCard({ part, motoMap, onOsClick }: PartCardProps) {
  const [expanded, setExpanded] = useState(false)

  const sortedOsEvents = [...part.os_events].sort((a, b) => (a.km_at_event ?? 0) - (b.km_at_event ?? 0))

  return (
    <div
      className="mb-2 overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-colors hover:border-[#3a3a3a]"
      style={{ borderLeft: `3px solid ${part.color}` }}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-[#e0e0e0]">{part.name}</div>
          <div className="mt-0.5 font-mono text-[10px] text-[#555]">{part.key}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {part.os_events.length > 0 && (
            <span className="rounded-full bg-[#3a1010] px-2 py-0.5 text-[11px] font-medium text-[#ff6b6b]">
              {part.os_events.length} OS
            </span>
          )}
          {part.error_motos.length > 0 && (
            <span className="rounded-full bg-[#2a1f00] px-2 py-0.5 text-[11px] text-[#d4a017]">
              {part.error_motos.length} erro{part.error_motos.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[11px] text-[#555]">{part.valid_motos.length} motos</span>
          <div className="min-w-[80px] text-right text-[15px] font-semibold" style={{ color: part.color }}>
            +{formatNumber(part.total_km)} km
          </div>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-[#555]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[#555]" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#222] px-4 py-3">
          {/* Stats grid */}
          <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            <StatCell label="km médio / moto" value={formatNumber(part.avg_km)} />
            {part.valid_motos.length > 1 && (
              <StatCell label="range" value={`${formatNumber(part.min_km)}–${formatNumber(part.max_km)}`} />
            )}
            <StatCell label="motos válidas" value={part.valid_motos.length} />
            {part.os_rate > 0 && (
              <StatCell label="OS / 1k km" value={part.os_rate} accent="#ff6b6b" />
            )}
            {part.error_motos.length > 0 && (
              <StatCell label="c/ erro" value={part.error_motos.length} accent="#d4a017" />
            )}
            {part.km_breakdown.reset > 0 && (
              <StatCell label="odôm. reiniciado" value={part.km_breakdown.reset} accent="#ff6b6b" />
            )}
          </div>

          {/* OS list */}
          {part.os_events.length > 0 ? (
            <>
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-[#555]">
                Ordens de serviço — clique para ver detalhes
              </div>
              {sortedOsEvents.map((e) => {
                const moto = motoMap[e.license_plate]
                const err = moto ? validateKm(moto) : null
                const kmSinceInstall = moto && !err ? (e.km_at_event ?? 0) - (moto.km_at_install ?? 0) : null

                return (
                  <div
                    key={e.os_id}
                    onClick={() => onOsClick(e.os_id, part.key)}
                    className="flex cursor-pointer flex-wrap items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] transition-colors hover:bg-[#222]"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6b6b]" />
                    <span className="min-w-[54px] font-mono text-[#ff6b6b]">#{e.os_id}</span>
                    <span className="min-w-[72px] font-mono text-[10px] text-[#666]">{e.license_plate}</span>
                    <span className="tabular-nums text-[#ccc]">{formatNumber(e.km_at_event)} km</span>
                    {kmSinceInstall != null && (
                      <span className="text-[#666]">+{formatNumber(kmSinceInstall)} desde inst.</span>
                    )}
                    {e.os_description && (
                      <span className="truncate text-[#777]">{e.os_description}</span>
                    )}
                    <span className="ml-auto shrink-0 text-[#555]">{formatDate(e.os_date)}</span>
                  </div>
                )
              })}
            </>
          ) : (
            <p className="py-4 text-center text-[12px] text-[#555]">Nenhuma OS registrada.</p>
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
    <div className="rounded-lg bg-[#111] px-2.5 py-2">
      <div className="text-[10px] text-[#555]">{label}</div>
      <div className="mt-0.5 text-[13px] font-medium" style={{ color: accent ?? '#ccc' }}>
        {value}
      </div>
    </div>
  )
}
