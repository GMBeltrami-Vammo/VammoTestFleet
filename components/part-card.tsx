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
    <div className="mb-1.5 overflow-hidden rounded-xl border border-border bg-[#1e1e1e]">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2.5 px-3.5 py-3 hover:bg-[#242424]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: part.color }} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{part.name}</div>
          <div className="font-mono text-[11px] text-muted-foreground">{part.key}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {part.os_events.length > 0 && (
            <span className="whitespace-nowrap rounded bg-[#2a0d0d] px-1.5 py-0.5 text-[11px] font-medium text-[#ff6b6b]">
              {part.os_events.length} OS
            </span>
          )}
          {part.error_motos.length > 0 && (
            <span className="whitespace-nowrap rounded bg-[#2a1f00] px-1.5 py-0.5 text-[11px] text-[#d4a017]">
              {part.error_motos.length} erro{part.error_motos.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{part.valid_motos.length} motos</span>
          <div className="min-w-[74px] text-right text-[15px] font-medium" style={{ color: part.color }}>
            +{formatNumber(part.total_km)} km
          </div>
          {expanded ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#333333] px-3.5 py-3.5 pt-1">
          {/* Stats row */}
          <div className="my-2.5 flex flex-wrap gap-5" style={{ marginBottom: part.os_events.length > 0 ? 14 : 0 }}>
            <div>
              <div className="text-[10px] text-muted-foreground">km médio / moto</div>
              <div className="text-sm font-medium">{formatNumber(part.avg_km)}</div>
            </div>
            {part.valid_motos.length > 1 && (
              <div>
                <div className="text-[10px] text-muted-foreground">range km</div>
                <div className="text-sm">{formatNumber(part.min_km)} – {formatNumber(part.max_km)}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] text-muted-foreground">motos válidas</div>
              <div className="text-sm">{part.valid_motos.length}</div>
            </div>
            {part.os_rate > 0 && (
              <div>
                <div className="text-[10px] text-[#ff6b6b]">OS / 1.000 km</div>
                <div className="text-sm font-medium text-[#ff6b6b]">{part.os_rate}</div>
              </div>
            )}
            {part.error_motos.length > 0 && (
              <div>
                <div className="text-[10px] text-[#d4a017]">motos c/ erro</div>
                <div className="text-sm text-[#d4a017]">{part.error_motos.length}</div>
              </div>
            )}
            {part.km_breakdown.reset > 0 && (
              <div>
                <div className="text-[10px] text-[#ff6b6b]">odômetro reiniciado</div>
                <div className="text-sm text-[#ff6b6b]">{part.km_breakdown.reset}</div>
              </div>
            )}
          </div>

          {/* OS list */}
          {part.os_events.length > 0 ? (
            <>
              <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
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
                    className="flex cursor-pointer flex-wrap items-center gap-2.5 rounded border-b border-[#333333] px-1 py-1.5 text-xs transition-colors hover:bg-[#242424]"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6b6b]" />
                    <span className="min-w-[54px] font-mono text-[#ff6b6b]">#{e.os_id}</span>
                    <span className="min-w-[72px] font-mono text-[11px] text-muted-foreground">{e.license_plate}</span>
                    <span className="tabular-nums">{formatNumber(e.km_at_event)} km</span>
                    {kmSinceInstall != null && (
                      <span className="text-muted-foreground">(+{formatNumber(kmSinceInstall)} desde instalação)</span>
                    )}
                    <span className="ml-auto text-muted-foreground">{formatDate(e.os_date)}</span>
                  </div>
                )
              })}
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Nenhuma OS registrada.</p>
          )}
        </div>
      )}
    </div>
  )
}
