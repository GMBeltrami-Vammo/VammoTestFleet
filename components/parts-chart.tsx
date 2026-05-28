'use client'

import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { PartData } from '@/lib/types'
import { formatNumber, truncate } from '@/lib/data'

interface PartsChartProps {
  parts: PartData[]
}

export function PartsChart({ parts }: PartsChartProps) {
  const data = parts.map((p) => ({
    name: truncate(p.name, 38),
    total_km: p.total_km,
    color: p.color,
    valid_motos: p.valid_motos.length,
  }))

  return (
    <div className="w-full" style={{ height: Math.max(180, parts.length * 62 + 60) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <XAxis
            type="number"
            tick={{ fill: '#666', fontSize: 11 }}
            tickFormatter={(v) => formatNumber(v)}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#888', fontSize: 12 }}
            width={200}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const d = payload[0].payload
              return (
                <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
                  <div className="font-medium">{formatNumber(d.total_km)} km</div>
                  <div className="text-muted-foreground">{d.valid_motos} motos válidas</div>
                </div>
              )
            }}
          />
          <Bar dataKey="total_km" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color + 'bb'} stroke={entry.color} strokeWidth={1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
