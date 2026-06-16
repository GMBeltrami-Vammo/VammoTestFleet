import type { Moto, OsEvent } from './types'

export interface FleetData {
  motos: Moto[]
  osEvents: OsEvent[]
}

/**
 * Fetches fleet data from our own authenticated API route ('/api/fleet') rather
 * than querying Supabase directly from the browser. This keeps the Supabase
 * credentials server-side and ensures the data is only reachable by an
 * authenticated (NextAuth) session.
 */
export async function fetchFleet(): Promise<FleetData> {
  const res = await fetch('/api/fleet')
  if (!res.ok) {
    throw new Error(`Failed to load fleet data (${res.status})`)
  }
  return res.json() as Promise<FleetData>
}
