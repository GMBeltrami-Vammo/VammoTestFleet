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

export interface ProcessedMoto extends Moto {
  km_since_install: number
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
}

export type SortOption = 'km_since_install' | 'km_current' | 'km_at_install'
