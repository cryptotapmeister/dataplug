import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { id, type } = await request.json()

    if (!id || !type) {
      return NextResponse.json({ success: false, error: 'Missing id or type' }, { status: 400 })
    }

    // Create server-side Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Ignore cookie set errors
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Ignore cookie remove errors
            }
          },
        },
      }
    )

    // Fetch current stream to get current click count
    const { data: stream, error: fetchError } = await supabase
      .from('streams')
      .select('clicks_node, clicks_python')
      .eq('id', id)
      .single()

    if (fetchError || !stream) {
      return NextResponse.json({ success: false, error: 'Stream not found' }, { status: 404 })
    }

    // Increment the appropriate counter
    if (type === 'node') {
      const newCount = (stream.clicks_node || 0) + 1
      const { error: updateError } = await supabase
        .from('streams')
        .update({ clicks_node: newCount })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }
    } else if (type === 'python') {
      const newCount = (stream.clicks_python || 0) + 1
      const { error: updateError } = await supabase
        .from('streams')
        .update({ clicks_python: newCount })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 })
  }
}

