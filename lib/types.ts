export interface Moto {
  license_plate: string
  dev_parts_on_bike: string
  dev_item_codes: string
  item_groups: string
  km_at_install: number | null
  km_current: number | null
}

export interface OsEvent {
  license_plate: string
  os_id: string
  km_at_event: number | null
  os_date: string
  os_related: boolean
  os_description: string | null
  ai_reason: string | null
}

// KM data-quality classification. A "reset" means the current odometer is below
// the install reading — the signature of an instrument-cluster (velocímetro)
// swap, since the replacement cluster starts near zero.
export type KmCategory = 'ok' | 'missing' | 'negative' | 'reset' | 'no_variation'

export interface KmStatus {
  category: KmCategory
  label: string | null // null when category is 'ok'
  isError: boolean // true for any non-ok category
}

export interface KmBreakdown {
  reset: number
  no_variation: number
  missing: number
  negative: number
}

export interface ProcessedMoto extends Moto {
  km_since_install: number
  kmStatus: KmStatus
  /** Convenience mirror of kmStatus.label (null when valid). */
  kmError: string | null
}

export interface PartData {
  key: string
  name: string
  item_groups: string
  color: string
  motos: Moto[]
  os_events: OsEvent[]
  valid_motos: Moto[]
  error_motos: Moto[]
  total_km: number
  avg_km: number
  min_km: number
  max_km: number
  os_rate: number
  /** Count of error motos by reason, so KPIs can be presented honestly. */
  km_breakdown: KmBreakdown
}

export type SortOption = 'km_since_install' | 'km_current' | 'km_at_install'
