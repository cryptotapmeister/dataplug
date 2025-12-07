import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const endpoint = searchParams.get('endpoint')

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
  }

  try {
    const startTime = Date.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(endpoint, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'DataPlug-Ping/1.0',
      },
    }).catch(() => null)

    clearTimeout(timeoutId)
    const latency = Date.now() - startTime

    if (response && response.ok) {
      return NextResponse.json({ latency })
    } else {
      return NextResponse.json({ latency, error: 'Request failed' }, { status: 200 })
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ latency: 3000, error: 'Timeout' }, { status: 200 })
    }
    return NextResponse.json({ latency: null, error: 'Failed to ping' }, { status: 500 })
  }
}

