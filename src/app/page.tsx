import { createClient } from '@supabase/supabase-js'
import HomeClient from './HomeClient'

async function getRandomStreamPlaceholder(): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return 'search 100+ real-time streams'
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Fetch all stream names
    const { data, error } = await supabase
      .from('streams')
      .select('name')
      .limit(100)

    if (error || !data || data.length === 0) {
      return 'search 100+ real-time streams'
    }

    // Randomly pick one stream name
    const randomIndex = Math.floor(Math.random() * data.length)
    const randomStream = data[randomIndex]
    
    return `e.g. ${randomStream.name.toLowerCase()}`
  } catch (error) {
    console.error('Error fetching random stream:', error)
    return 'search 100+ real-time streams'
  }
}

export default async function Home() {
  const placeholder = await getRandomStreamPlaceholder()
  
  return <HomeClient placeholder={placeholder} />
}
