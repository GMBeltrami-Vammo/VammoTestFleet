'use client'

import { AlertTriangle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import type { ProcessedMoto, OsEvent } from '@/lib/types'
import { formatNumber, formatDate, displayParts } from '@/lib/data'
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
      className="mb-1.5 cursor-pointer overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] transition-colors hover:border-[#444] hover:bg-[#1e1e1e]"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="min-w-[20px] text-right text-[11px] tabular-nums text-[#555]">
          {rank}
        </span>
        <span className="min-w-[76px] font-mono text-[13px] font-semibold tracking-wider text-[#e0e0e0]">
          {moto.license_plate}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-[#888]">
          {displayParts(moto.dev_parts_on_bike)}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {osEvents.length > 0 && (
            <span className="rounded-full bg-[#3a1010] px-2 py-0.5 text-[11px] font-medium text-[#ff6b6b]">
              {osEvents.length} OS
            </span>
          )}
          {moto.kmStatus.isError && (
            <span className="rounded-full bg-[#2a1f00] px-2 py-0.5 text-[11px] text-[#d4a017]">
              erro
            </span>
          )}
          <span className="text-[#444]">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        </div>
      </div>

      {/* KM bar or error */}
      <div className="px-3 pb-2.5">
        {moto.kmStatus.isError ? (
          <div
            className={`flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] ${
              moto.kmStatus.category === 'reset'
                ? 'bg-[#2a1010] text-[#ff6b6b]'
                : 'bg-[#2a1f00] text-[#d4a017]'
            }`}
          >
            {moto.kmStatus.category === 'reset' ? <RotateCcw size={13} /> : <AlertTriangle size={13} />}
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
                <div className="text-[10px] text-[#555]">instalação</div>
                <div className="text-[12px] tabular-nums text-[#999]">{formatNumber(moto.km_at_install)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#555]">atual</div>
                <div className="text-[12px] tabular-nums text-[#999]">{formatNumber(moto.km_current)}</div>
              </div>
              <div className="min-w-[68px] text-right">
                <div className="text-[10px] text-[#555]">desde peça</div>
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
        <div className="border-t border-[#222] px-3 pb-3 pt-2.5">
          {osEvents.length > 0 ? (
            <>
              <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-[#555]">
                Ordens de Serviço
              </div>
              {[...osEvents]
                .sort((a, b) => (a.km_at_event ?? 0) - (b.km_at_event ?? 0))
                .map((e) => (
                  <div
                    key={e.os_id}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-[12px] transition-colors hover:bg-[#222]"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6b6b]" />
                    <span className="min-w-[60px] font-mono text-[#ff6b6b]">#{e.os_id}</span>
                    <span className="tabular-nums text-[#ccc]">{formatNumber(e.km_at_event)} km</span>
                    {!moto.kmError && e.km_at_event != null && (
                      <span className="text-[#666]">
                        +{formatNumber(e.km_at_event - moto.km_at_install!)} desde instalação
                      </span>
                    )}
                    {e.os_description && (
                      <span className="ml-2 truncate text-[#777]">{e.os_description}</span>
                    )}
                    <span className="ml-auto shrink-0 text-[#555]">{formatDate(e.os_date)}</span>
                  </div>
                ))}
            </>
          ) : (
            <p className="py-4 text-center text-[12px] text-[#555]">Nenhuma OS registrada.</p>
          )}
        </div>
      )}
    </div>
  )
}
