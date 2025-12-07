import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🔵 /api/click called')
  
  try {
    const body = await request.json()
    const { id, type } = body
    
    console.log('📥 Received:', { id, type })

    if (!id || !type) {
      console.error('❌ Missing id or type')
      return NextResponse.json({ success: false, error: 'Missing id or type' }, { status: 400 })
    }

    // Create direct Supabase client for server-side operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase credentials')
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('✅ Supabase client created')

    // Fetch current stream to get current click count
    console.log('🔍 Fetching stream with id:', id)
    const { data: stream, error: fetchError } = await supabase
      .from('streams')
      .select('clicks_node, clicks_python')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 404 })
    }

    if (!stream) {
      console.error('❌ Stream not found')
      return NextResponse.json({ success: false, error: 'Stream not found' }, { status: 404 })
    }

    console.log('📊 Current counts:', { clicks_node: stream.clicks_node, clicks_python: stream.clicks_python })

    // Increment the appropriate counter
    if (type === 'node') {
      const newCount = (stream.clicks_node || 0) + 1
      console.log(`⬆️ Incrementing clicks_node: ${stream.clicks_node || 0} → ${newCount}`)
      
      const { data: updateData, error: updateError } = await supabase
        .from('streams')
        .update({ clicks_node: newCount })
        .eq('id', id)
        .select()

      if (updateError) {
        console.error('❌ Update error (node):', updateError)
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }

      console.log('✅ Successfully updated clicks_node:', updateData)
    } else if (type === 'python') {
      const newCount = (stream.clicks_python || 0) + 1
      console.log(`⬆️ Incrementing clicks_python: ${stream.clicks_python || 0} → ${newCount}`)
      
      const { data: updateData, error: updateError } = await supabase
        .from('streams')
        .update({ clicks_python: newCount })
        .eq('id', id)
        .select()

      if (updateError) {
        console.error('❌ Update error (python):', updateError)
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }

      console.log('✅ Successfully updated clicks_python:', updateData)
    } else {
      console.error('❌ Invalid type:', type)
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 })
    }

    console.log('✅ Click tracking successful')
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('❌ Exception:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 })
  }
}

