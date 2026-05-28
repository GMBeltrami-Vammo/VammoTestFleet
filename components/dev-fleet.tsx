'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { fetchMotos, fetchOsEvents } from '@/lib/supabase-queries'
import { validateKm, formatNumber, buildPartData, COLOR_POOL } from '@/lib/data'
import type { ProcessedMoto, OsEvent, SortOption, Moto } from '@/lib/types'
import { PartsChart } from './parts-chart'
import { PartCard } from './part-card'
import { MotoRow } from './moto-row'

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
      className="min-w-[90px] flex-1 rounded-lg px-3.5 py-2.5"
      style={{ backgroundColor: warning ? '#2a1f00' : '#1e1e1e' }}
    >
      <div className="mb-0.5 text-[11px]" style={{ color: warning ? '#d4a017' : '#b3b3b3' }}>
        {label}
      </div>
      <div
        className="text-xl font-medium"
        style={{ color: warning ? '#d4a017' : highlight ? '#ff6b6b' : '#e0e0e0' }}
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
    default: 'border-foreground/30 bg-foreground/10 text-foreground',
    os: 'border-destructive/50 bg-destructive/10 text-destructive',
    warning: 'border-warning/50 bg-warning/10 text-warning',
  }
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-[12px] transition-colors ${active
          ? activeStyles[variant]
          : 'border-[#333333] bg-[#1e1e1e] text-muted-foreground hover:text-foreground'
        }`}
    >
      {children}
    </button>
  )
}

export function DevFleet() {
  const [activeTab, setActiveTab] = useState<TabType>('parts')

  // Por peça filters
  const [partsGroupFilter, setPartsGroupFilter] = useState('all')
  const [partsSortBy, setPartsSortBy] = useState<PartSortOption>('total_km')
  const [partsOnlyWithOs, setPartsOnlyWithOs] = useState(false)
  const [partsOnlyWithErrors, setPartsOnlyWithErrors] = useState(false)

  // Por moto filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('km_since_install')
  const [expandedMotos, setExpandedMotos] = useState<Set<string>>(new Set())

  // OS tab filters
  const [osPartFilter, setOsPartFilter] = useState('all')
  const [osLicenseSearch, setOsLicenseSearch] = useState('')
  const [osDateFrom, setOsDateFrom] = useState('')
  const [osDateTo, setOsDateTo] = useState('')
  const [osSortBy, setOsSortBy] = useState<OsSortOption>('os_date')

  // Cross-tab highlight
  const [highlightedOsId, setHighlightedOsId] = useState<string | null>(null)
  const highlightedRowRef = useRef<HTMLTableRowElement>(null)

  // Fetch data
  const { data: allMotos = [], isLoading: loadingMotos } = useSWR('motos', fetchMotos, { refreshInterval: 60000 })
  const { data: allOsEvents = [], isLoading: loadingOs } = useSWR('os-events', fetchOsEvents, { refreshInterval: 60000 })

  const isLoading = loadingMotos || loadingOs

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

  const groups = useMemo(() => [...new Set(allMotos.map((m) => m.item_groups))], [allMotos])

  // License plates per part key (for OS filtering)
  const platesByPartKey = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    allMotos.forEach((m) => {
      if (!map[m.dev_item_codes]) map[m.dev_item_codes] = new Set()
      map[m.dev_item_codes].add(m.license_plate)
    })
    return map
  }, [allMotos])

  // Filtered + sorted part data
  const filteredPartData = useMemo(() => {
    let data = partData
    if (partsGroupFilter !== 'all') data = data.filter((p) => p.item_groups === partsGroupFilter)
    if (partsOnlyWithOs) data = data.filter((p) => p.os_events.length > 0)
    if (partsOnlyWithErrors) data = data.filter((p) => p.error_motos.length > 0)
    return [...data].sort((a, b) => {
      switch (partsSortBy) {
        case 'os_count': return b.os_events.length - a.os_events.length
        case 'avg_km': return b.avg_km - a.avg_km
        case 'error_count': return b.error_motos.length - a.error_motos.length
        default: return b.total_km - a.total_km
      }
    })
  }, [partData, partsGroupFilter, partsSortBy, partsOnlyWithOs, partsOnlyWithErrors])

  // Filtered + sorted OS events
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

  // Processed motos
  const processedMotos = useMemo(() => {
    const search = searchTerm.toUpperCase().trim()
    return allMotos
      .map((m) => ({
        ...m,
        kmError: validateKm(m),
        km_since_install: validateKm(m) ? -1 : (m.km_current ?? 0) - (m.km_at_install ?? 0),
      }))
      .filter((m) => {
        if (search && !m.license_plate.includes(search) && !m.dev_parts_on_bike.toUpperCase().includes(search))
          return false
        if (selectedGroup !== 'all' && m.item_groups !== selectedGroup) return false
        return true
      })
      .sort((a, b) => {
        if (a.kmError && !b.kmError) return 1
        if (!a.kmError && b.kmError) return -1
        return (b[sortBy] ?? 0) - (a[sortBy] ?? 0)
      }) as ProcessedMoto[]
  }, [allMotos, searchTerm, selectedGroup, sortBy])

  // Stats
  const partsStats = useMemo(() => {
    const totalKm = partData.reduce((s, p) => s + p.total_km, 0)
    const totalOs = partData.reduce((s, p) => s + p.os_events.length, 0)
    const errCount = allMotos.filter((m) => validateKm(m)).length
    return { totalKm, totalOs, errCount, partCount: partData.length, motoCount: allMotos.length }
  }, [partData, allMotos])

  const motosStats = useMemo(() => {
    const errCount = processedMotos.filter((m) => m.kmError).length
    const withOs = processedMotos.filter((m) => (osMap[m.license_plate]?.length ?? 0) > 0).length
    const totalKm = processedMotos.filter((m) => !m.kmError).reduce((s, m) => s + m.km_since_install, 0)
    return { motoCount: processedMotos.length, errCount, withOs, totalKm }
  }, [processedMotos, osMap])

  // Cross-tab: click OS in Por peça → navigate to OS tab with filter + highlight
  const handleOsClick = (osId: string, partKey: string) => {
    setOsPartFilter(partKey)
    setHighlightedOsId(osId)
    setActiveTab('os')
  }

  // Scroll to highlighted row after tab switch
  useEffect(() => {
    if (activeTab === 'os' && highlightedOsId) {
      const timer = setTimeout(() => {
        highlightedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [activeTab, highlightedOsId])

  // Clear highlight after 3 seconds
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
    <div className="mx-auto max-w-[920px] px-5 py-7">
      <h1 className="mb-5 text-lg font-medium">Dev fleet</h1>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="mb-5 flex gap-0.5 border-b border-[#333333]">
            <button
              className={`mb-[-0.5px] border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${activeTab === 'parts'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground/80'
                }`}
              onClick={() => setActiveTab('parts')}
            >
              Por peça
              {partsStats.errCount > 0 && (
                <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px] text-warning">
                  {partsStats.errCount}
                </span>
              )}
            </button>
            <button
              className={`mb-[-0.5px] border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${activeTab === 'motos'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground/80'
                }`}
              onClick={() => setActiveTab('motos')}
            >
              Por moto
            </button>
            <button
              className={`mb-[-0.5px] border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${activeTab === 'os'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground/80'
                }`}
              onClick={() => setActiveTab('os')}
            >
              OS relacionadas
              {allOsEvents.length > 0 && (
                <span className="ml-1.5 rounded-full bg-destructive/20 px-1.5 py-0.5 text-[10px] text-destructive">
                  {allOsEvents.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Por peça ── */}
          {activeTab === 'parts' && (
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <StatCard label="peças distintas" value={partsStats.partCount} />
                <StatCard label="motos monitoradas" value={partsStats.motoCount} />
                <StatCard label="km acumulados" value={formatNumber(partsStats.totalKm)} />
                <StatCard label="OS registradas" value={partsStats.totalOs} highlight={partsStats.totalOs > 0} />
                {partsStats.errCount > 0 && <StatCard label="erros de km" value={partsStats.errCount} warning />}
              </div>

              {/* Filters */}
              <div className="mb-3 flex flex-wrap gap-2">
                <Select value={partsGroupFilter} onValueChange={setPartsGroupFilter}>
                  <SelectTrigger className="min-w-[130px] flex-1 border-[#333333] bg-[#1e1e1e] text-[13px]">
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {groups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={partsSortBy} onValueChange={(v) => setPartsSortBy(v as PartSortOption)}>
                  <SelectTrigger className="min-w-[155px] border-[#333333] bg-[#1e1e1e] text-[13px]">
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
              <div className="mb-2.5 flex flex-wrap gap-2.5 text-xs text-muted-foreground">
                {filteredPartData.map((p) => (
                  <span key={p.key} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: p.color }} />
                    {p.name.length > 40 ? p.name.slice(0, 40) + '…' : p.name}
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
              <div className="mb-4 flex flex-wrap gap-2">
                <StatCard label="motos" value={motosStats.motoCount} />
                {motosStats.errCount > 0 && <StatCard label="erros de km" value={motosStats.errCount} warning />}
                <StatCard label="com OS" value={motosStats.withOs} highlight={motosStats.withOs > 0} />
                <StatCard label="km total (válidas)" value={formatNumber(motosStats.totalKm)} />
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <Input
                  type="text"
                  placeholder="Buscar placa ou peça..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="min-w-[110px] flex-1 border-[#333333] bg-[#1e1e1e] text-[13px]"
                />
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="min-w-[120px] flex-1 border-[#333333] bg-[#1e1e1e] text-[13px]">
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {groups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="border-[#333333] bg-[#1e1e1e] text-[13px]">
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
                    color={colorMap[m.dev_item_codes] || COLOR_POOL[0]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── OS relacionadas ── */}
          {activeTab === 'os' && (
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <StatCard label="OS encontradas" value={filteredOsEvents.length} highlight={filteredOsEvents.length > 0} />
                {osPartFilter !== 'all' && (
                  <StatCard
                    label="filtrando por peça"
                    value={partData.find((p) => p.key === osPartFilter)?.name?.split(' ').slice(0, 3).join(' ') ?? osPartFilter}
                  />
                )}
              </div>

              {/* Filters */}
              <div className="mb-3 flex flex-wrap gap-2">
                <Input
                  type="text"
                  placeholder="Buscar placa..."
                  value={osLicenseSearch}
                  onChange={(e) => setOsLicenseSearch(e.target.value)}
                  className="min-w-[110px] flex-1 border-[#333333] bg-[#1e1e1e] text-[13px]"
                />
                <Select value={osPartFilter} onValueChange={setOsPartFilter}>
                  <SelectTrigger className="min-w-[150px] flex-1 border-[#333333] bg-[#1e1e1e] text-[13px]">
                    <SelectValue placeholder="Todas as peças" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as peças</SelectItem>
                    {partData.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.name.length > 40 ? p.name.slice(0, 40) + '…' : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={osSortBy} onValueChange={(v) => setOsSortBy(v as OsSortOption)}>
                  <SelectTrigger className="border-[#333333] bg-[#1e1e1e] text-[13px]">
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
                  className="w-[140px] border-[#333333] bg-[#1e1e1e] text-[13px]"
                />
                <Input
                  type="date"
                  value={osDateTo}
                  onChange={(e) => setOsDateTo(e.target.value)}
                  className="w-[140px] border-[#333333] bg-[#1e1e1e] text-[13px]"
                />
                {osHasActiveFilter && (
                  <button
                    onClick={() => {
                      setOsPartFilter('all')
                      setOsLicenseSearch('')
                      setOsDateFrom('')
                      setOsDateTo('')
                    }}
                    className="rounded-md border border-[#333333] bg-[#1e1e1e] px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#333333] text-left text-[11px] text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Placa</th>
                      <th className="pb-2 pr-4 font-medium">Peça</th>
                      <th className="pb-2 pr-4 font-medium">Data</th>
                      <th className="pb-2 pr-4 font-medium">KM</th>
                      <th className="pb-2 pr-4 font-medium">Descrição</th>
                      <th className="pb-2 font-medium">Razão IA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOsEvents.map((e, i) => (
                      <tr
                        key={e.os_id}
                        ref={e.os_id === highlightedOsId ? highlightedRowRef : null}
                        className={`border-b border-[#333333] transition-colors duration-500 hover:bg-[#242424] ${e.os_id === highlightedOsId
                            ? 'bg-[#1a2a1a] outline outline-1 outline-green-800/40'
                            : i % 2 === 0
                              ? 'bg-[#1a1a1a]'
                              : 'bg-[#1e1e1e]'
                          }`}
                      >
                        <td className="py-2.5 pr-4 font-medium">{e.license_plate}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">
                          {motoMap[e.license_plate]?.dev_parts_on_bike ?? '—'}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground">
                          {e.os_date ? e.os_date.slice(0, 10) : '—'}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{formatNumber(e.km_at_event)}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{e.os_description ?? '—'}</td>
                        <td className="py-2.5 text-muted-foreground">{e.AI_reason ?? '—'}</td>
                      </tr>
                    ))}
                    {filteredOsEvents.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
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
