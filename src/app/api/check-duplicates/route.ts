import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Fetch all streams
    const { data: streams, error } = await supabase
      .from('streams')
      .select('id, name, endpoint, description')
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!streams || streams.length === 0) {
      return NextResponse.json({ 
        total: 0,
        duplicates: [],
        message: 'No streams found'
      })
    }

    // Check for duplicates by name
    const nameMap = new Map<string, any[]>()
    streams.forEach(stream => {
      const name = stream.name?.toLowerCase().trim() || ''
      if (!nameMap.has(name)) {
        nameMap.set(name, [])
      }
      nameMap.get(name)!.push(stream)
    })

    const nameDuplicates = Array.from(nameMap.entries())
      .filter(([_, streams]) => streams.length > 1)
      .map(([name, streams]) => ({
        name,
        count: streams.length,
        streams: streams.map(s => ({ id: s.id, name: s.name, endpoint: s.endpoint }))
      }))

    // Check for duplicates by endpoint
    const endpointMap = new Map<string, any[]>()
    streams.forEach(stream => {
      const endpoint = stream.endpoint?.toLowerCase().trim() || ''
      if (!endpointMap.has(endpoint)) {
        endpointMap.set(endpoint, [])
      }
      endpointMap.get(endpoint)!.push(stream)
    })

    const endpointDuplicates = Array.from(endpointMap.entries())
      .filter(([_, streams]) => streams.length > 1)
      .map(([endpoint, streams]) => ({
        endpoint,
        count: streams.length,
        streams: streams.map(s => ({ id: s.id, name: s.name, endpoint: s.endpoint }))
      }))

    // Check for exact duplicates (same name AND endpoint)
    const exactMap = new Map<string, any[]>()
    streams.forEach(stream => {
      const key = `${(stream.name || '').toLowerCase().trim()}|||${(stream.endpoint || '').toLowerCase().trim()}`
      if (!exactMap.has(key)) {
        exactMap.set(key, [])
      }
      exactMap.get(key)!.push(stream)
    })

    const exactDuplicates = Array.from(exactMap.entries())
      .filter(([_, streams]) => streams.length > 1)
      .map(([key, streams]) => {
        const [name, endpoint] = key.split('|||')
        return {
          name,
          endpoint,
          count: streams.length,
          streams: streams.map(s => ({ id: s.id, name: s.name, endpoint: s.endpoint }))
        }
      })

    return NextResponse.json({
      total: streams.length,
      unique_by_name: nameMap.size,
      unique_by_endpoint: endpointMap.size,
      unique_exact: exactMap.size,
      duplicates_by_name: nameDuplicates,
      duplicates_by_endpoint: endpointDuplicates,
      duplicates_exact: exactDuplicates,
      has_duplicates: nameDuplicates.length > 0 || endpointDuplicates.length > 0 || exactDuplicates.length > 0
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

