'use client'

import type { OsEvent } from '@/lib/types'
import { formatNumber } from '@/lib/data'

interface KmBarProps {
  kmAtInstall: number
  kmCurrent: number
  osEvents: OsEvent[]
  color: string
}

export function KmBar({ kmAtInstall, kmCurrent, osEvents, color }: KmBarProps) {
  const pctInstall = Math.min((kmAtInstall / kmCurrent) * 100, 100)

  return (
    <div className="relative h-[5px] rounded-[3px] bg-[#2a2a2a]">
      {/* Installation segment */}
      <div
        className="absolute left-0 top-0 h-full rounded-l-[3px] bg-[#333]"
        style={{ width: `${pctInstall}%` }}
      />
      {/* Usage segment */}
      <div
        className="absolute top-0 h-full rounded-r-[3px] opacity-90"
        style={{
          left: `${pctInstall}%`,
          width: `${100 - pctInstall}%`,
          background: color,
        }}
      />
      {/* Installation marker */}
      <div
        className="absolute -top-[3px] h-[11px] w-[2px] -translate-x-1/2 rounded-sm bg-[#666]"
        style={{ left: `${pctInstall}%` }}
      />
      {/* OS event markers */}
      {osEvents.map((e) => {
        const km = e.km_at_event ?? 0
        const p = (km / kmCurrent) * 100
        if (p < 0 || p > 100) return null
        return (
          <div
            key={e.os_id}
            title={`OS #${e.os_id} — ${e.km_at_event != null ? formatNumber(e.km_at_event) + ' km' : 'Sem KM'}`}
            className="absolute -top-[5px] z-10 h-[15px] w-[2px] -translate-x-1/2 cursor-default rounded-sm bg-destructive"
            style={{ left: `${p}%` }}
          />
        )
      })}
    </div>
  )
}
