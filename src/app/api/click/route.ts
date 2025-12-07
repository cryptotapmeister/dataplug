import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { id, type } = await request.json()

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing id or type' }, { status: 400 })
    }

    // Silently track the click
    await supabase.from('clicks').insert({
      stream_id: id,
      type: type,
      created_at: new Date().toISOString(),
    }).catch(() => {
      // Silently fail if table doesn't exist or insert fails
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: true }) // Always return success for silent tracking
  }
}

