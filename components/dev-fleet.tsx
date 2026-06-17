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
        backgroundColor: warning ? '#1e1700' : '#161616',
        border: `1px solid ${warning ? '#3a2d00' : '#222'}`,
      }}
    >
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: warning ? '#6b5100' : '#444' }}>
        {label}
      </div>
      <div
        className="text-[22px] font-semibold tabular-nums leading-none"
        style={{ color: warning ? '#d4a017' : highlight ? '#ff6b6b' : '#d0d0d0' }}
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
    default: 'border-[#444] bg-[#222] text-[#e0e0e0]',
    os: 'border-[#5a1a1a] bg-[#2a0d0d] text-[#ff6b6b]',
    warning: 'border-[#4a3a00] bg-[#2a2000] text-[#d4a017]',
  }
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
        active
          ? activeStyles[variant]
          : 'border-[#2a2a2a] bg-[#161616] text-[#555] hover:text-[#999]'
      }`}
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

  // Individual group names (exploded from multi-part bikes)
  const groups = useMemo(() => {
    const s = new Set<string>()
    allMotos.forEach((m) => parseArrayField(m.item_groups).forEach((g) => s.add(g)))
    return [...s].sort()
  }, [allMotos])

  // Maps individual part code → set of license plates
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

  // Resolve the display color for a moto: first matching individual part code wins
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

  return (
    <div className="mx-auto max-w-[940px] px-5 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-[15px] font-semibold tracking-tight text-[#e0e0e0]">Dev fleet</h1>
        <span className="text-[11px] text-[#444]">atualiza a cada 60 s</span>
      </div>

      {error && !data ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-[#ff6b6b]">Não foi possível carregar os dados da frota.</p>
          <button
            onClick={() => mutate()}
            className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 text-[13px] text-[#666] transition-colors hover:text-[#ccc]"
          >
            Tentar novamente
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-7 w-7 text-[#555]" />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="mb-6 flex gap-0 border-b border-[#222]">
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
                className={`mb-[-1px] border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#e0e0e0] text-[#e0e0e0]'
                    : 'border-transparent text-[#555] hover:text-[#888]'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.badge && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      tab.badge.warning
                        ? 'bg-[#2a1f00] text-[#d4a017]'
                        : 'bg-[#2a0d0d] text-[#ff6b6b]'
                    }`}
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
                  <SelectTrigger className="min-w-[130px] flex-1 border-[#2a2a2a] bg-[#161616] text-[13px]">
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {groups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={partsSortBy} onValueChange={(v) => setPartsSortBy(v as PartSortOption)}>
                  <SelectTrigger className="min-w-[155px] border-[#2a2a2a] bg-[#161616] text-[13px]">
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
              <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-[#555]">
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
                  className="min-w-[110px] flex-1 border-[#2a2a2a] bg-[#161616] text-[13px]"
                />
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="min-w-[120px] flex-1 border-[#2a2a2a] bg-[#161616] text-[13px]">
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {groups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="border-[#2a2a2a] bg-[#161616] text-[13px]">
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
                  className="min-w-[110px] flex-1 border-[#2a2a2a] bg-[#161616] text-[13px]"
                />
                <Select value={osPartFilter} onValueChange={setOsPartFilter}>
                  <SelectTrigger className="min-w-[150px] flex-1 border-[#2a2a2a] bg-[#161616] text-[13px]">
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
                  <SelectTrigger className="border-[#2a2a2a] bg-[#161616] text-[13px]">
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
                  className="w-[140px] border-[#2a2a2a] bg-[#161616] text-[13px]"
                />
                <Input
                  type="date"
                  value={osDateTo}
                  onChange={(e) => setOsDateTo(e.target.value)}
                  className="w-[140px] border-[#2a2a2a] bg-[#161616] text-[13px]"
                />
                {osHasActiveFilter && (
                  <button
                    onClick={() => {
                      setOsPartFilter('all')
                      setOsLicenseSearch('')
                      setOsDateFrom('')
                      setOsDateTo('')
                    }}
                    className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 text-[12px] text-[#555] transition-colors hover:text-[#999]"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#222]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#222] bg-[#111]">
                      {['Placa', 'Peça', 'Data', 'KM', 'Descrição', 'Razão IA'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-[#444]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOsEvents.map((e, i) => (
                      <tr
                        key={e.os_id}
                        ref={e.os_id === highlightedOsId ? highlightedRowRef : null}
                        className={`border-b border-[#1a1a1a] transition-colors duration-500 hover:bg-[#1e1e1e] ${
                          e.os_id === highlightedOsId
                            ? 'bg-[#0d1f0d] outline outline-1 outline-green-800/30'
                            : i % 2 === 0
                              ? 'bg-[#141414]'
                              : 'bg-[#161616]'
                        }`}
                      >
                        <td className="px-3 py-2.5 font-mono font-medium text-[#e0e0e0]">{e.license_plate}</td>
                        <td className="px-3 py-2.5 text-[#666]">
                          {displayParts(motoMap[e.license_plate]?.dev_parts_on_bike) !== '—'
                            ? displayParts(motoMap[e.license_plate]?.dev_parts_on_bike)
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-[#666]">
                          {e.os_date ? formatDate(e.os_date) : '—'}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-[#888]">{formatNumber(e.km_at_event)}</td>
                        <td className="max-w-[200px] px-3 py-2.5 text-[#666]">
                          <span className="line-clamp-2">{e.os_description ?? '—'}</span>
                        </td>
                        <td className="max-w-[180px] px-3 py-2.5 text-[#666]">
                          <span className="line-clamp-2">{e.ai_reason ?? '—'}</span>
                        </td>
                      </tr>
                    ))}
                    {filteredOsEvents.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-[13px] text-[#444]">
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
