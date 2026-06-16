import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { auth } from '@/auth'
import type { Moto, OsEvent } from '@/lib/types'

// Fleet data is per-session sensitive and refreshes often — never cache it.
export const dynamic = 'force-dynamic'

/**
 * Server-only Supabase client. Uses the service-role key (server secret) so the
 * anon/publishable key is never shipped to the browser and the queryable
 * surface is not exposed to unauthenticated clients. Falls back to the anon key
 * if no service role key is configured — the endpoint is still gated by auth().
 */
function getServerSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase server credentials are not configured')
  }

  return createServerClient(url, key, {
    // No cookie-based auth here — we authorize via NextAuth in the route itself.
    cookies: { getAll: () => [], setAll: () => {} },
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let supabase: ReturnType<typeof getServerSupabase>
  try {
    supabase = getServerSupabase()
  } catch (err) {
    console.error('Fleet API misconfiguration:', err)
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  // Independent queries — run them in parallel to avoid a request waterfall.
  const [motosRes, osRes] = await Promise.all([
    supabase
      .schema('fleet')
      .from('test_part_bike')
      .select('license_plate, dev_parts_on_bike, dev_item_codes, item_groups, km_at_install, km_current'),
    supabase
      .schema('fleet')
      .from('test_part_service_order')
      .select('license_plate, os_id, km_at_event, os_date, os_related, os_description, ai_reason')
      .eq('os_related', 'TRUE'),
  ])

  if (motosRes.error || osRes.error) {
    // Log the detail server-side; return a generic message to the client.
    console.error('Fleet query failed:', motosRes.error ?? osRes.error)
    return NextResponse.json({ error: 'Failed to load fleet data' }, { status: 502 })
  }

  return NextResponse.json({
    motos: (motosRes.data ?? []) as Moto[],
    osEvents: (osRes.data ?? []) as OsEvent[],
  })
}
