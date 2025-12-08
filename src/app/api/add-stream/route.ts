import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, endpoint, description, tags } = body

    // Validate required fields
    if (!name || !endpoint || !description) {
      return NextResponse.json(
        { success: false, error: 'Name, endpoint, and description are required' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const keyToUse = supabaseServiceKey || supabaseAnonKey

    if (!supabaseUrl || !keyToUse) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, keyToUse, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Process tags: convert comma-separated string to array
    const tagsArray = tags
      ? tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
      : []

    // Insert new stream
    const { data, error } = await supabase
      .from('streams')
      .insert({
        name: name.trim(),
        endpoint: endpoint.trim(),
        description: description.trim(),
        tags: tagsArray.length > 0 ? tagsArray : null,
        clicks_node: 0,
        clicks_python: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting stream:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error: any) {
    console.error('Exception in add-stream:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

