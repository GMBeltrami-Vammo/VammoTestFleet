import type { Moto, OsEvent, PartData, KmStatus, KmBreakdown } from './types'

export const COLOR_POOL = ['#EF9F27', '#1D9E75', '#378ADD', '#D4537E', '#7F77DD']

/**
 * Classifies the KM data quality of a moto. The categories map to the known
 * upstream telemetry failure modes:
 *  - missing: bike never reported odometer (no telemetry / unmatched join)
 *  - negative: sentinel/garbage value
 *  - reset: current < install — the odometer went backwards, which a real bike
 *    cannot do. This is the fingerprint of an instrument-cluster (velocímetro)
 *    swap: the replacement cluster starts near zero. Confirmed against the
 *    reliability dataset (resets cluster at near-0 km, independent of the A/B arm).
 *  - no_variation: current == install — recently installed or a frozen cluster.
 */
export function classifyKm(moto: Moto): KmStatus {
  if (moto.km_current == null || moto.km_at_install == null) {
    return { category: 'missing', label: 'KM ausente (sem telemetria)', isError: true }
  }
  if (moto.km_current < 0 || moto.km_at_install < 0) {
    return { category: 'negative', label: 'KM negativo', isError: true }
  }
  if (moto.km_current < moto.km_at_install) {
    return { category: 'reset', label: 'Odômetro reiniciado (possível troca de velocímetro)', isError: true }
  }
  if (moto.km_current === moto.km_at_install) {
    return { category: 'no_variation', label: 'Sem variação de KM', isError: true }
  }
  return { category: 'ok', label: null, isError: false }
}

/** Back-compat wrapper: returns the error label, or null when KM is valid. */
export function validateKm(moto: Moto): string | null {
  return classifyKm(moto).label
}

export function formatNumber(n: number | null): string {
  return n != null ? Math.round(n).toLocaleString('pt-BR') : '—'
}

export function formatDate(s: string | null): string {
  return s ? new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

export function buildPartData(motos: Moto[], osEvents: OsEvent[]): PartData[] {
  const groups: Record<string, { key: string; name: string; item_groups: string; motos: Moto[]; os_events: OsEvent[] }> = {}

  motos.forEach((m) => {
    const k = m.dev_item_codes
    if (!groups[k]) {
      groups[k] = { key: k, name: m.dev_parts_on_bike, item_groups: m.item_groups, motos: [], os_events: [] }
    }
    groups[k].motos.push(m)
  })

  const motoPartMap: Record<string, string> = {}
  motos.forEach((m) => {
    motoPartMap[m.license_plate] = m.dev_item_codes
  })

  osEvents.forEach((e) => {
    const partKey = motoPartMap[e.license_plate]
    if (partKey && groups[partKey]) {
      groups[partKey].os_events.push(e)
    }
  })

  return Object.values(groups)
    .map((g, i) => {
      const color = COLOR_POOL[i % COLOR_POOL.length]
      // Single pass: classify each moto once, splitting valid vs error and
      // tallying why each error row was excluded (so KPIs stay interpretable).
      const valid: Moto[] = []
      const errs: Moto[] = []
      const km_breakdown: KmBreakdown = { reset: 0, no_variation: 0, missing: 0, negative: 0 }
      for (const m of g.motos) {
        const status = classifyKm(m)
        if (status.category === 'ok') {
          valid.push(m)
        } else {
          errs.push(m)
          km_breakdown[status.category] += 1
        }
      }
      const kmValues = valid.map((m) => (m.km_current ?? 0) - (m.km_at_install ?? 0))
      const total_km = kmValues.reduce((s, v) => s + v, 0)
      const min_km = kmValues.length ? Math.min(...kmValues) : 0
      const max_km = kmValues.length ? Math.max(...kmValues) : 0
      const os_rate = total_km > 0 ? Math.round((g.os_events.length / total_km) * 1000 * 10) / 10 : 0
      return {
        ...g,
        color,
        valid_motos: valid,
        error_motos: errs,
        total_km,
        avg_km: valid.length ? Math.round(total_km / valid.length) : 0,
        min_km,
        max_km,
        os_rate,
        km_breakdown,
      }
    })
    .sort((a, b) => b.total_km - a.total_km)
}
