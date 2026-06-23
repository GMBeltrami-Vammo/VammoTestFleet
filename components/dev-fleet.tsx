'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { fetchFleet } from '@/lib/supabase-queries'
import { validateKm, classifyKm, formatNumber, formatDate, buildPartData, parseArrayField, displayParts, COLOR_POOL } from '@/lib/data'
import type { ProcessedMoto, OsEvent, SortOption, Moto } from '@/lib/types'
import { PartsChart } from './parts-chart'
import { PartCard } from './part-card'
import { MotoRow } from './moto-row'

const EMPTY_MOTOS: Moto[] = []
const EMPTY_OS: OsEvent[] = []

type TabType = 'parts' | 'motos' | 'os'
type PartSortOption = 'total_km' | 'os_count' | 'avg_km' | 'error_count'
type OsSortOption = 'os_date' | 'km_at_event' | 'license_plate'

// ─── Design tokens (adapted from goBuy Lumen dark palette) ───────────────────
const T = {
  bg:          '#222222',   // page background
  surface:     '#2a2a2a',   // card / input surface
  surface2:    '#323232',   // elevated surface (hover, alt rows)
  line:        '#3d3d3d',   // borders
  lineStrong:  '#4d4d4d',   // strong borders / separators
  ink:         '#f0f0f0',   // primary text
  muted:       '#b0b0b0',   // secondary text
  faint:       '#727272',   // label / placeholder
  warnBg:      '#231f00',
  warnBorder:  '#4a3d00',
  warnLabel:   '#8a6e00',
  warnText:    '#d4a017',
  dangerBg:    '#2a0d0d',
  dangerBorder:'#5a1a1a',
  dangerText:  '#ff6b6b',
}

function StatCard({
  label,
  value,
  highlight,
  warning,
}: {
  label: string
  value: string | number
  highlight?: boolean
  warning?: boolean
}) {
  return (
    <div
      className="flex min-w-[90px] flex-1 flex-col justify-between rounded-xl px-3.5 py-2.5"
      style={{
        backgroundColor: warning ? T.warnBg : T.surface,
        border: `1px solid ${warning ? T.warnBorder : T.line}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 6px 20px -10px rgba(0,0,0,0.5)',
      }}
    >
      <div
        className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em]"
        style={{ color: warning ? T.warnLabel : T.faint }}
      >
        {label}
      </div>
      <div
        className="text-[22px] font-semibold tabular-nums leading-none"
        style={{ color: warning ? T.warnText : highlight ? T.dangerText : T.ink }}
      >
        {value}
      </div>
    </div>
  )
}

function FilterToggle({
  active,
  onClick,
  variant = 'default',
  children,
}: {
  active: boolean
  onClick: () => void
  variant?: 'default' | 'os' | 'warning'
  children: React.ReactNode
}) {
  const activeStyles = {
    default: { border: T.lineStrong, bg: T.surface2, color: T.ink },
    os: { border: T.dangerBorder, bg: T.dangerBg, color: T.dangerText },
    warning: { border: T.warnBorder, bg: T.warnBg, color: T.warnText },
  }
  const s = activeStyles[variant]
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
      style={
        active
          ? { border: `1px solid ${s.border}`, backgroundColor: s.bg, color: s.color }
          : { border: `1px solid ${T.line}`, backgroundColor: T.surface, color: T.faint }
      }
    >
      {children}
    </button>
  )
}

export function DevFleet() {
  const [activeTab, setActiveTab] = useState<TabType>('parts')

  const [partsGroupFilter, setPartsGroupFilter] = useState('all')
  const [partsSortBy, setPartsSortBy] = useState<PartSortOption>('total_km')
  const [partsOnlyWithOs, setPartsOnlyWithOs] = useState(false)
  const [partsOnlyWithErrors, setPartsOnlyWithErrors] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('km_since_install')
  const [expandedMotos, setExpandedMotos] = useState<Set<string>>(new Set())

  const [osPartFilter, setOsPartFilter] = useState('all')
  const [osLicenseSearch, setOsLicenseSearch] = useState('')
  const [osDateFrom, setOsDateFrom] = useState('')
  const [osDateTo, setOsDateTo] = useState('')
  const [osSortBy, setOsSortBy] = useState<OsSortOption>('os_date')
  const [expandedOsIds, setExpandedOsIds] = useState<Set<string>>(new Set())

  const [highlightedOsId, setHighlightedOsId] = useState<string | null>(null)
  const highlightedRowRef = useRef<HTMLTableRowElement>(null)

  const { data, isLoading, error, mutate } = useSWR('/api/fleet', fetchFleet, { refreshInterval: 60000 })
  const allMotos = data?.motos ?? EMPTY_MOTOS
  const allOsEvents = data?.osEvents ?? EMPTY_OS

  const partData = useMemo(() => buildPartData(allMotos, allOsEvents), [allMotos, allOsEvents])

  const motoMap = useMemo(() => {
    const map: Record<string, Moto> = {}
    allMotos.forEach((m) => (map[m.license_plate] = m))
    return map
  }, [allMotos])

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {}
    partData.forEach((p) => (map[p.key] = p.color))
    return map
  }, [partData])

  const osMap = useMemo(() => {
    const map: Record<string, OsEvent[]> = {}
    allOsEvents.forEach((e) => {
      if (!map[e.license_plate]) map[e.license_plate] = []
      map[e.license_plate].push(e)
    })
    return map
  }, [allOsEvents])

  const groups = useMemo(() => {
    const s = new Set<string>()
    allMotos.forEach((m) => parseArrayField(m.item_groups).forEach((g) => s.add(g)))
    return [...s].sort()
  }, [allMotos])

  const platesByPartKey = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    allMotos.forEach((m) => {
      parseArrayField(m.dev_item_codes).forEach((code) => {
        if (!map[code]) map[code] = new Set()
        map[code].add(m.license_plate)
      })
    })
    return map
  }, [allMotos])

  const getMotoColor = (m: Moto): string => {
    const codes = parseArrayField(m.dev_item_codes)
    for (const code of codes) {
      if (colorMap[code]) return colorMap[code]
    }
    return COLOR_POOL[0]
  }

  const filteredPartData = useMemo(() => {
    let d = partData
    if (partsGroupFilter !== 'all') d = d.filter((p) => p.item_groups === partsGroupFilter)
    if (partsOnlyWithOs) d = d.filter((p) => p.os_events.length > 0)
    if (partsOnlyWithErrors) d = d.filter((p) => p.error_motos.length > 0)
    return [...d].sort((a, b) => {
      switch (partsSortBy) {
        case 'os_count': return b.os_events.length - a.os_events.length
        case 'avg_km': return b.avg_km - a.avg_km
        case 'error_count': return b.error_motos.length - a.error_motos.length
        default: return b.total_km - a.total_km
      }
    })
  }, [partData, partsGroupFilter, partsSortBy, partsOnlyWithOs, partsOnlyWithErrors])

  const filteredOsEvents = useMemo(() => {
    let events = allOsEvents
    if (osPartFilter !== 'all') {
      const plates = platesByPartKey[osPartFilter] ?? new Set()
      events = events.filter((e) => plates.has(e.license_plate))
    }
    if (osLicenseSearch) {
      events = events.filter((e) => e.license_plate.includes(osLicenseSearch.toUpperCase().trim()))
    }
    if (osDateFrom) events = events.filter((e) => e.os_date >= osDateFrom)
    if (osDateTo) events = events.filter((e) => e.os_date <= osDateTo + 'T23:59:59')
    return [...events].sort((a, b) => {
      switch (osSortBy) {
        case 'km_at_event': return (b.km_at_event ?? 0) - (a.km_at_event ?? 0)
        case 'license_plate': return a.license_plate.localeCompare(b.license_plate)
        default: return b.os_date.localeCompare(a.os_date)
      }
    })
  }, [allOsEvents, platesByPartKey, osPartFilter, osLicenseSearch, osDateFrom, osDateTo, osSortBy])

  const processedMotos = useMemo(() => {
    const search = searchTerm.toUpperCase().trim()
    return allMotos
      .map((m) => {
        const kmStatus = classifyKm(m)
        return {
          ...m,
          kmStatus,
          kmError: kmStatus.label,
          km_since_install: kmStatus.isError ? -1 : (m.km_current ?? 0) - (m.km_at_install ?? 0),
        }
      })
      .filter((m) => {
        if (search && !m.license_plate.includes(search) && !displayParts(m.dev_parts_on_bike).toUpperCase().includes(search))
          return false
        if (selectedGroup !== 'all' && !parseArrayField(m.item_groups).includes(selectedGroup))
          return false
        return true
      })
      .sort((a, b) => {
        if (a.kmError && !b.kmError) return 1
        if (!a.kmError && b.kmError) return -1
        return (b[sortBy] ?? 0) - (a[sortBy] ?? 0)
      }) as ProcessedMoto[]
  }, [allMotos, searchTerm, selectedGroup, sortBy])

  const partsStats = useMemo(() => {
    const totalKm = partData.reduce((s, p) => s + p.total_km, 0)
    const totalOs = partData.reduce((s, p) => s + p.os_events.length, 0)
    const errCount = allMotos.filter((m) => validateKm(m)).length
    const resetCount = partData.reduce((s, p) => s + p.km_breakdown.reset, 0)
    return { totalKm, totalOs, errCount, resetCount, partCount: partData.length, motoCount: allMotos.length }
  }, [partData, allMotos])

  const motosStats = useMemo(() => {
    const errCount = processedMotos.filter((m) => m.kmError).length
    const withOs = processedMotos.filter((m) => (osMap[m.license_plate]?.length ?? 0) > 0).length
    const totalKm = processedMotos.filter((m) => !m.kmError).reduce((s, m) => s + m.km_since_install, 0)
    return { motoCount: processedMotos.length, errCount, withOs, totalKm }
  }, [processedMotos, osMap])

  const handleOsClick = (osId: string, partKey: string) => {
    setOsPartFilter(partKey)
    setHighlightedOsId(osId)
    setActiveTab('os')
  }

  const toggleOsRow = (osId: string) => {
    setExpandedOsIds((prev) => {
      const next = new Set(prev)
      if (next.has(osId)) next.delete(osId)
      else next.add(osId)
      return next
    })
  }

  useEffect(() => {
    if (activeTab === 'os' && highlightedOsId) {
      const timer = setTimeout(() => {
        highlightedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [activeTab, highlightedOsId])

  useEffect(() => {
    if (!highlightedOsId) return
    const timer = setTimeout(() => setHighlightedOsId(null), 3000)
    return () => clearTimeout(timer)
  }, [highlightedOsId])

  const toggleMoto = (plate: string) => {
    setExpandedMotos((prev) => {
      const next = new Set(prev)
      if (next.has(plate)) next.delete(plate)
      else next.add(plate)
      return next
    })
  }

  const osHasActiveFilter = osPartFilter !== 'all' || osLicenseSearch || osDateFrom || osDateTo

  const selectStyle = {
    className: 'border-[#3d3d3d] bg-[#2a2a2a] text-[13px]',
  }

  return (
    <div className="mx-auto max-w-[940px] px-5 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-[15px] font-semibold tracking-tight" style={{ color: T.ink }}>Dev fleet</h1>
        <span className="text-[11px]" style={{ color: T.faint }}>atualiza a cada 60 s</span>
      </div>

      {error && !data ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm" style={{ color: T.dangerText }}>Não foi possível carregar os dados da frota.</p>
          <button
            onClick={() => mutate()}
            className="rounded-lg px-3 py-1.5 text-[13px] transition-colors"
            style={{ border: `1px solid ${T.line}`, backgroundColor: T.surface, color: T.faint }}
          >
            Tentar novamente
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-7 w-7" style={{ color: T.faint }} />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="mb-6 flex gap-0" style={{ borderBottom: `1px solid ${T.line}` }}>
            {(
              [
                {
                  id: 'parts' as TabType,
                  label: 'Por peça',
                  badge: partsStats.errCount > 0 ? { value: partsStats.errCount, warning: true } : null,
                },
                { id: 'motos' as TabType, label: 'Por moto', badge: null },
                {
                  id: 'os' as TabType,
                  label: 'OS relacionadas',
                  badge: allOsEvents.length > 0 ? { value: allOsEvents.length, warning: false } : null,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                className="mb-[-1px] border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors"
                style={{
                  borderBottomColor: activeTab === tab.id ? T.ink : 'transparent',
                  color: activeTab === tab.id ? T.ink : T.faint,
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.badge && (
                  <span
                    className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={
                      tab.badge.warning
                        ? { backgroundColor: T.warnBg, color: T.warnText }
                        : { backgroundColor: T.dangerBg, color: T.dangerText }
                    }
                  >
                    {tab.badge.value}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Por peça ── */}
          {activeTab === 'parts' && (
            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                <StatCard label="peças" value={partsStats.partCount} />
                <StatCard label="motos" value={partsStats.motoCount} />
                <StatCard label="km acumulados" value={formatNumber(partsStats.totalKm)} />
                <StatCard label="OS registradas" value={partsStats.totalOs} highlight={partsStats.totalOs > 0} />
                {partsStats.errCount > 0 && <StatCard label="erros de km" value={partsStats.errCount} warning />}
                {partsStats.resetCount > 0 && <StatCard label="odôm. reiniciado" value={partsStats.resetCount} highlight />}
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <Select value={partsGroupFilter} onValueChange={setPartsGroupFilter}>
                  <SelectTrigger className={`min-w-[130px] flex-1 ${selectStyle.className}`}>
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {groups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={partsSortBy} onValueChange={(v) => setPartsSortBy(v as PartSortOption)}>
                  <SelectTrigger className={`min-w-[155px] ${selectStyle.className}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total_km">Ordenar: km total</SelectItem>
                    <SelectItem value="os_count">Ordenar: nº de OS</SelectItem>
                    <SelectItem value="avg_km">Ordenar: km médio</SelectItem>
                    <SelectItem value="error_count">Ordenar: erros</SelectItem>
                  </SelectContent>
                </Select>
                <FilterToggle active={partsOnlyWithOs} onClick={() => setPartsOnlyWithOs((v) => !v)} variant="os">
                  Só com OS
                </FilterToggle>
                <FilterToggle active={partsOnlyWithErrors} onClick={() => setPartsOnlyWithErrors((v) => !v)} variant="warning">
                  Só com erros
                </FilterToggle>
              </div>

              {/* Legend */}
              <div className="mb-3 flex flex-wrap gap-3 text-[11px]" style={{ color: T.faint }}>
                {filteredPartData.map((p) => (
                  <span key={p.key} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: p.color }} />
                    {p.name.length > 44 ? p.name.slice(0, 44) + '…' : p.name}
                  </span>
                ))}
              </div>

              <PartsChart parts={filteredPartData} />

              <div className="mt-5">
                {filteredPartData.map((p) => (
                  <PartCard key={p.key} part={p} motoMap={motoMap} onOsClick={handleOsClick} />
                ))}
              </div>
            </div>
          )}

          {/* ── Por moto ── */}
          {activeTab === 'motos' && (
            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                <StatCard label="motos" value={motosStats.motoCount} />
                {motosStats.errCount > 0 && <StatCard label="erros de km" value={motosStats.errCount} warning />}
                <StatCard label="com OS" value={motosStats.withOs} highlight={motosStats.withOs > 0} />
                <StatCard label="km total (válidas)" value={formatNumber(motosStats.totalKm)} />
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <Input
                  type="text"
                  placeholder="Buscar placa ou peça..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`min-w-[110px] flex-1 ${selectStyle.className}`}
                />
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className={`min-w-[120px] flex-1 ${selectStyle.className}`}>
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {groups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className={selectStyle.className}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="km_since_install">Ordenar: km desde peça</SelectItem>
                    <SelectItem value="km_current">Ordenar: km total</SelectItem>
                    <SelectItem value="km_at_install">Ordenar: km na instalação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                {processedMotos.map((m, i) => (
                  <MotoRow
                    key={m.license_plate}
                    moto={m}
                    rank={i + 1}
                    osEvents={osMap[m.license_plate] || []}
                    expanded={expandedMotos.has(m.license_plate)}
                    onToggle={() => toggleMoto(m.license_plate)}
                    color={getMotoColor(m)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── OS relacionadas ── */}
          {activeTab === 'os' && (
            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                <StatCard label="OS encontradas" value={filteredOsEvents.length} highlight={filteredOsEvents.length > 0} />
                {osPartFilter !== 'all' && (
                  <StatCard
                    label="filtrando por peça"
                    value={partData.find((p) => p.key === osPartFilter)?.name?.split(' ').slice(0, 3).join(' ') ?? osPartFilter}
                  />
                )}
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <Input
                  type="text"
                  placeholder="Buscar placa..."
                  value={osLicenseSearch}
                  onChange={(e) => setOsLicenseSearch(e.target.value)}
                  className={`min-w-[110px] flex-1 ${selectStyle.className}`}
                />
                <Select value={osPartFilter} onValueChange={setOsPartFilter}>
                  <SelectTrigger className={`min-w-[150px] flex-1 ${selectStyle.className}`}>
                    <SelectValue placeholder="Todas as peças" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as peças</SelectItem>
                    {partData.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.name.length > 44 ? p.name.slice(0, 44) + '…' : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={osSortBy} onValueChange={(v) => setOsSortBy(v as OsSortOption)}>
                  <SelectTrigger className={selectStyle.className}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="os_date">Ordenar: data</SelectItem>
                    <SelectItem value="km_at_event">Ordenar: km</SelectItem>
                    <SelectItem value="license_plate">Ordenar: placa</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={osDateFrom}
                  onChange={(e) => setOsDateFrom(e.target.value)}
                  className={`w-[140px] ${selectStyle.className}`}
                />
                <Input
                  type="date"
                  value={osDateTo}
                  onChange={(e) => setOsDateTo(e.target.value)}
                  className={`w-[140px] ${selectStyle.className}`}
                />
                {osHasActiveFilter && (
                  <button
                    onClick={() => {
                      setOsPartFilter('all')
                      setOsLicenseSearch('')
                      setOsDateFrom('')
                      setOsDateTo('')
                    }}
                    className="rounded-lg px-3 py-1.5 text-[12px] transition-colors"
                    style={{ border: `1px solid ${T.line}`, backgroundColor: T.surface, color: T.faint }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              {/* Hint text */}
              {filteredOsEvents.length > 0 && (
                <p className="mb-2 text-[11px]" style={{ color: T.faint }}>
                  Clique em uma linha para ler a descrição e razão completas.
                </p>
              )}

              <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${T.line}` }}>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.lineStrong}`, backgroundColor: T.bg }}>
                      {['Placa', 'Peça', 'Data', 'KM', 'Descrição', 'Razão IA'].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em]"
                          style={{ color: T.faint }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOsEvents.map((e, i) => {
                      const isExpanded = expandedOsIds.has(e.os_id)
                      const isHighlighted = e.os_id === highlightedOsId
                      const rowBg = isHighlighted
                        ? '#0d1f0d'
                        : i % 2 === 0
                          ? T.surface
                          : T.bg

                      return (
                        <>
                          <tr
                            key={e.os_id}
                            ref={isHighlighted ? highlightedRowRef : null}
                            onClick={() => toggleOsRow(e.os_id)}
                            className="cursor-pointer transition-colors duration-300"
                            style={{
                              borderBottom: `1px solid ${isExpanded ? T.lineStrong : T.line}`,
                              backgroundColor: isExpanded ? T.surface2 : rowBg,
                              outline: isHighlighted ? '1px solid rgba(34,100,34,0.4)' : undefined,
                            }}
                            onMouseEnter={(ev) => {
                              if (!isExpanded) (ev.currentTarget as HTMLElement).style.backgroundColor = T.surface2
                            }}
                            onMouseLeave={(ev) => {
                              if (!isExpanded) (ev.currentTarget as HTMLElement).style.backgroundColor = rowBg
                            }}
                          >
                            <td className="px-3 py-2.5 font-mono font-semibold" style={{ color: T.ink }}>
                              {e.license_plate}
                            </td>
                            <td className="px-3 py-2.5" style={{ color: T.muted }}>
                              {displayParts(motoMap[e.license_plate]?.dev_parts_on_bike) !== '—'
                                ? displayParts(motoMap[e.license_plate]?.dev_parts_on_bike)
                                : '—'}
                            </td>
                            <td className="px-3 py-2.5" style={{ color: T.muted }}>
                              {e.os_date ? formatDate(e.os_date) : '—'}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums" style={{ color: T.muted }}>
                              {formatNumber(e.km_at_event)}
                            </td>
                            <td className="max-w-[200px] px-3 py-2.5" style={{ color: T.faint }}>
                              <span className="line-clamp-2">{e.os_description ?? '—'}</span>
                            </td>
                            <td className="max-w-[180px] px-3 py-2.5" style={{ color: T.faint }}>
                              <span className="line-clamp-2">{e.ai_reason ?? '—'}</span>
                            </td>
                          </tr>

                          {/* Expanded detail row */}
                          {isExpanded && (
                            <tr
                              key={`${e.os_id}-detail`}
                              style={{ borderBottom: `1px solid ${T.lineStrong}`, backgroundColor: T.surface2 }}
                            >
                              <td colSpan={6} className="px-4 pb-4 pt-0">
                                <div className="grid gap-4 sm:grid-cols-2">
                                  {/* Descrição */}
                                  <div
                                    className="rounded-lg p-3"
                                    style={{ backgroundColor: T.bg, border: `1px solid ${T.line}` }}
                                  >
                                    <div
                                      className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]"
                                      style={{ color: T.faint }}
                                    >
                                      Descrição completa
                                    </div>
                                    <p className="text-[13px] leading-relaxed" style={{ color: T.muted }}>
                                      {e.os_description ?? <span style={{ color: T.faint }}>—</span>}
                                    </p>
                                  </div>
                                  {/* Razão IA */}
                                  <div
                                    className="rounded-lg p-3"
                                    style={{ backgroundColor: T.bg, border: `1px solid ${T.line}` }}
                                  >
                                    <div
                                      className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]"
                                      style={{ color: T.faint }}
                                    >
                                      Razão IA
                                    </div>
                                    <p className="text-[13px] leading-relaxed" style={{ color: T.muted }}>
                                      {e.ai_reason ?? <span style={{ color: T.faint }}>—</span>}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                    {filteredOsEvents.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-[13px]" style={{ color: T.faint }}>
                          Nenhuma OS encontrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
