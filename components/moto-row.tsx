'use client'

import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import type { ProcessedMoto, OsEvent } from '@/lib/types'
import { formatNumber, formatDate } from '@/lib/data'
import { KmBar } from './km-bar'

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

  return (
    <div
      onClick={onToggle}
      className="mb-1 cursor-pointer rounded-xl border border-[#333333] bg-[#1e1e1e] p-3 transition-colors hover:border-[#555]"
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="min-w-[20px] text-right text-[11px] tabular-nums text-muted-foreground">
          #{rank}
        </span>
        <span className="min-w-[75px] font-mono text-[13px] font-medium tracking-wider">
          {moto.license_plate}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-[#b3b3b3]">
          {moto.dev_parts_on_bike}
        </span>
        <span
          className="shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[11px]"
          style={{ background: `${color}22`, color }}
        >
          {moto.item_groups}
        </span>
        {osEvents.length > 0 && (
          <span className="shrink-0 rounded bg-destructive/20 px-2 py-0.5 text-[11px] font-medium text-destructive">
            {osEvents.length} OS
          </span>
        )}
        <span className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>

      {/* KM bar or error */}
      {moto.kmError ? (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-warning/10 px-2.5 py-1.5 text-[12px] text-warning">
          <AlertTriangle size={14} />
          <strong>Erro na aquisição de KM</strong>
          <span className="opacity-75">— {moto.kmError}</span>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <div className="min-w-[20px]" />
          <div className="flex-1">
            <KmBar
              kmAtInstall={moto.km_at_install!}
              kmCurrent={moto.km_current!}
              osEvents={osEvents}
              color={color}
            />
          </div>
          <div className="flex shrink-0 gap-3.5">
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">instalação</div>
              <div className="text-[12px] tabular-nums">{formatNumber(moto.km_at_install)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">atual</div>
              <div className="text-[12px] tabular-nums">{formatNumber(moto.km_current)}</div>
            </div>
            <div className="min-w-[64px] text-right">
              <div className="text-[10px] text-muted-foreground">desde peça</div>
              <div className="text-[13px] font-medium tabular-nums" style={{ color }}>
                +{formatNumber(kmSince)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded OS section */}
      {expanded && (
        <div className="mt-2.5 border-t border-[#333333] pt-2.5">
          {osEvents.length > 0 ? (
            <div>
              <div className="mb-1.5 text-[11px] tracking-wider text-muted-foreground">
                ORDENS DE SERVIÇO
              </div>
              {osEvents
                .sort((a, b) => (a.km_at_event ?? 0) - (b.km_at_event ?? 0))
                .map((e) => (
                  <div
                    key={e.os_id}
                    className="flex items-center gap-3 border-b border-[#333333] py-1.5 text-[12px]"
                  >
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-destructive" />
                    <span className="min-w-[56px] font-mono text-destructive">#{e.os_id}</span>
                    <span className="tabular-nums">{formatNumber(e.km_at_event)} km</span>
                    {!moto.kmError && (
                      <span className="text-muted-foreground">
                        (+{formatNumber(e.km_at_event - moto.km_at_install!)} desde instalação)
                      </span>
                    )}
                    <span className="ml-auto text-muted-foreground">{formatDate(e.os_date)}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="py-6 text-[13px] text-muted-foreground">Nenhuma OS registrada.</p>
          )}
        </div>
      )}
    </div>
  )
}
