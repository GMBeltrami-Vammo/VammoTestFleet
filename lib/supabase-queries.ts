console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)


import { createClient } from '@/lib/supabase/client'
import type { Moto, OsEvent } from './types'

export async function fetchMotos(): Promise<Moto[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .schema('fleet')
    .from('test_part_bike')
    .select('license_plate, dev_parts_on_bike, dev_item_codes, item_groups, km_at_install, km_current')

  if (error) {
    console.error('[v0] Error fetching motos:', error)
    return []
  }

  return data || []
}

export async function fetchOsEvents(): Promise<OsEvent[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .schema('fleet')
    .from('test_part_service_order')
    .select('license_plate, os_id, km_at_event, os_date, os_related, os_description, ai_reason')
    .eq('os_related', "TRUE")

  if (error) {
    console.error('[v0] Error fetching OS events:', error)
    return []
  }

  return data || []
}
