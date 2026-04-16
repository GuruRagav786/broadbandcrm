import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://agialehqqshkvwpszbes.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_H4s5Ydkugu0PGKS_2BU9ig_NPOuvIQl'
)
