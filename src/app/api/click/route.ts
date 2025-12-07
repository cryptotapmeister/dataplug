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
    // Use service role key for updates (bypasses RLS) or anon key if service role not available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials')
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    // Use service role key for updates (bypasses RLS) - this is safe for server-side API routes
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    console.log('✅ Supabase client created (using service role for updates)')

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
      
      const { data: updateData, error: updateError, status, statusText } = await supabase
        .from('streams')
        .update({ clicks_node: newCount })
        .eq('id', id)
        .select()

      console.log('📊 Update response:', { status, statusText, updateData, updateError })

      if (updateError) {
        console.error('❌ Update error (node):', updateError)
        return NextResponse.json({ success: false, error: updateError.message, details: updateError }, { status: 500 })
      }

      // Verify update worked - if updateData is empty, RLS might be blocking
      if (!updateData || updateData.length === 0) {
        console.error('⚠️ Update returned empty array - likely RLS blocking or update failed')
        
        // Try to verify by fetching again
        const { data: verifyData, error: verifyError } = await supabase
          .from('streams')
          .select('clicks_node')
          .eq('id', id)
          .single()
        
        console.log('🔍 Verification fetch:', { verifyData, verifyError })
        
        if (verifyData && verifyData.clicks_node === newCount) {
          console.log('✅ Update actually worked (verified)')
        } else {
          console.error('❌ Update did not work - RLS likely blocking')
          return NextResponse.json({ 
            success: false, 
            error: 'Update blocked by Row Level Security. Please enable UPDATE permissions for anon role on streams table.' 
          }, { status: 403 })
        }
      } else {
        console.log('✅ Successfully updated clicks_node:', updateData)
      }
    } else if (type === 'python') {
      const newCount = (stream.clicks_python || 0) + 1
      console.log(`⬆️ Incrementing clicks_python: ${stream.clicks_python || 0} → ${newCount}`)
      
      const { data: updateData, error: updateError, status, statusText } = await supabase
        .from('streams')
        .update({ clicks_python: newCount })
        .eq('id', id)
        .select()

      console.log('📊 Update response:', { status, statusText, updateData, updateError })

      if (updateError) {
        console.error('❌ Update error (python):', updateError)
        return NextResponse.json({ success: false, error: updateError.message, details: updateError }, { status: 500 })
      }

      // Verify update worked
      if (!updateData || updateData.length === 0) {
        console.error('⚠️ Update returned empty array - likely RLS blocking or update failed')
        
        // Try to verify by fetching again
        const { data: verifyData, error: verifyError } = await supabase
          .from('streams')
          .select('clicks_python')
          .eq('id', id)
          .single()
        
        console.log('🔍 Verification fetch:', { verifyData, verifyError })
        
        if (verifyData && verifyData.clicks_python === newCount) {
          console.log('✅ Update actually worked (verified)')
        } else {
          console.error('❌ Update did not work - RLS likely blocking')
          return NextResponse.json({ 
            success: false, 
            error: 'Update blocked by Row Level Security. Please enable UPDATE permissions for anon role on streams table.' 
          }, { status: 403 })
        }
      } else {
        console.log('✅ Successfully updated clicks_python:', updateData)
      }
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

