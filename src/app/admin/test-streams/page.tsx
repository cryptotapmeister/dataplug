'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Stream {
  id: string
  name: string
  endpoint: string
}

interface TestResult {
  stream: Stream
  status: 'testing' | 'works' | 'broken'
  latency: number | null
  error?: string
}

export default function TestStreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([])
  const [results, setResults] = useState<TestResult[]>([])
  const [testing, setTesting] = useState(false)
  const [completed, setCompleted] = useState(0)

  // Fetch all streams
  useEffect(() => {
    const fetchStreams = async () => {
      const { data, error } = await supabase
        .from('streams')
        .select('id, name, endpoint')
        .order('name')

      if (error) {
        console.error('Error fetching streams:', error)
        return
      }

      setStreams(data || [])
    }

    fetchStreams()
  }, [])

  // Test a single stream endpoint
  const testStream = async (stream: Stream): Promise<TestResult> => {
    return new Promise((resolve) => {
      const startTime = Date.now()
      let ws: WebSocket | null = null
      let timeoutId: NodeJS.Timeout | null = null
      let resolved = false

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId)
        if (ws) {
          try {
            ws.close()
          } catch (e) {
            // Ignore close errors
          }
        }
      }

      timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve({
            stream,
            status: 'broken',
            latency: null,
            error: 'Timeout (5s)',
          })
        }
      }, 5000)

      try {
        ws = new WebSocket(stream.endpoint)

        ws.onopen = () => {
          if (!resolved) {
            resolved = true
            const latency = Date.now() - startTime
            cleanup()
            resolve({
              stream,
              status: 'works',
              latency,
            })
          }
        }

        ws.onerror = () => {
          if (!resolved) {
            resolved = true
            cleanup()
            resolve({
              stream,
              status: 'broken',
              latency: null,
              error: 'Connection failed',
            })
          }
        }

        ws.onclose = () => {
          if (!resolved) {
            resolved = true
            cleanup()
            resolve({
              stream,
              status: 'broken',
              latency: null,
              error: 'Connection closed',
            })
          }
        }
      } catch (error: any) {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve({
            stream,
            status: 'broken',
            latency: null,
            error: error.message || 'Failed to connect',
          })
        }
      }
    })
  }

  // Test all streams
  const testAllStreams = async () => {
    setTesting(true)
    setResults([])
    setCompleted(0)

    const testResults: TestResult[] = []

    for (let i = 0; i < streams.length; i++) {
      const stream = streams[i]
      
      // Add testing state
      testResults.push({
        stream,
        status: 'testing',
        latency: null,
      })
      setResults([...testResults])
      setCompleted(i)

      // Test the stream
      const result = await testStream(stream)
      testResults[i] = result
      setResults([...testResults])
      setCompleted(i + 1)

      // Small delay between tests to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    setTesting(false)
  }

  // Sort results: broken first, then by ID (highest first)
  const sortedResults = [...results].sort((a, b) => {
    if (a.status === 'broken' && b.status !== 'broken') return -1
    if (a.status !== 'broken' && b.status === 'broken') return 1
    // Sort by ID descending (highest first)
    return parseInt(b.stream.id) - parseInt(a.stream.id)
  })

  const brokenCount = results.filter(r => r.status === 'broken').length
  const worksCount = results.filter(r => r.status === 'works').length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
      <div className="container mx-auto px-6 py-16">
        {/* Warning Banner */}
        <div
          className="mb-8 p-6 rounded-3xl text-center"
          style={{
            background: 'rgba(220, 38, 38, 0.2)',
            border: '2px solid rgba(220, 38, 38, 0.5)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <h2 className="text-3xl font-black text-red-400 mb-2">⚠️ TEST PAGE — DO NOT SHARE</h2>
          <p className="text-red-300">This is a testing tool for internal use only</p>
        </div>

        <h1 className="text-center text-6xl md:text-7xl font-black mb-8 text-white">
          Stream Endpoint Tester
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
          <div
            className="rounded-3xl p-6 text-center"
            style={{
              background: 'rgba(30, 30, 40, 0.7)',
              backdropFilter: 'blur(30px)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
            }}
          >
            <div className="text-4xl font-black text-white">{streams.length}</div>
            <div className="text-sm text-gray-400 mt-2">Total Streams</div>
          </div>
          <div
            className="rounded-3xl p-6 text-center"
            style={{
              background: 'rgba(30, 30, 40, 0.7)',
              backdropFilter: 'blur(30px)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <div className="text-4xl font-black text-green-400">{worksCount}</div>
            <div className="text-sm text-gray-400 mt-2">Working</div>
          </div>
          <div
            className="rounded-3xl p-6 text-center"
            style={{
              background: 'rgba(30, 30, 40, 0.7)',
              backdropFilter: 'blur(30px)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
            }}
          >
            <div className="text-4xl font-black text-red-400">{brokenCount}</div>
            <div className="text-sm text-gray-400 mt-2">Broken</div>
          </div>
        </div>

        {/* Test Button */}
        <div className="text-center mb-8">
          <button
            onClick={testAllStreams}
            disabled={testing || streams.length === 0}
            className="px-8 py-4 text-lg font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              border: '1px solid rgba(0, 255, 255, 0.4)',
              color: 'rgba(0, 255, 255, 0.9)',
              background: testing ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.6)'
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)'
              }
            }}
          >
            {testing ? `Testing... ${completed}/${streams.length}` : 'Test All Streams'}
          </button>
        </div>

        {/* Results Table */}
        {results.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: 'rgba(30, 30, 40, 0.7)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                boxShadow: '0 12px 48px rgba(0, 255, 255, 0.1), 0 0 0 1px rgba(0, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              }}
            >
              <div className="divide-y divide-cyan-500/10">
                {/* Header */}
                <div
                  className="p-6 border-b border-cyan-500/20"
                  style={{
                    background: 'rgba(0, 255, 255, 0.05)',
                  }}
                >
                  <div className="grid gap-4 items-center" style={{ gridTemplateColumns: '80px 1fr 2fr 120px 120px' }}>
                    <div className="text-cyan-300 font-semibold text-sm uppercase tracking-wide">ID</div>
                    <div className="text-cyan-300 font-semibold text-sm uppercase tracking-wide">Stream Name</div>
                    <div className="text-cyan-300 font-semibold text-sm uppercase tracking-wide">Endpoint</div>
                    <div className="text-center text-cyan-300 font-semibold text-sm uppercase tracking-wide">Status</div>
                    <div className="text-right text-cyan-300 font-semibold text-sm uppercase tracking-wide">Latency</div>
                  </div>
                </div>

                {/* Rows */}
                {sortedResults.map((result) => (
                  <div
                    key={result.stream.id}
                    className="p-6 hover:bg-cyan-500/5 transition-colors"
                    style={{
                      background: result.status === 'broken' ? 'rgba(220, 38, 38, 0.05)' : 'transparent',
                    }}
                  >
                    <div className="grid gap-4 items-center" style={{ gridTemplateColumns: '80px 1fr 2fr 120px 120px' }}>
                      <div className="text-white font-bold font-mono">{result.stream.id}</div>
                      <div className="text-white font-medium">{result.stream.name}</div>
                      <div className="text-gray-300 font-mono text-sm break-all">{result.stream.endpoint}</div>
                      <div className="text-center">
                        {result.status === 'testing' && (
                          <span className="text-yellow-400 font-semibold">Testing...</span>
                        )}
                        {result.status === 'works' && (
                          <span className="text-green-400 font-semibold">WORKS</span>
                        )}
                        {result.status === 'broken' && (
                          <span className="text-red-400 font-semibold">BROKEN</span>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        {result.status === 'testing' && (
                          <span className="text-gray-500">—</span>
                        )}
                        {result.status === 'works' && result.latency !== null && (
                          <span className="text-green-400 font-bold">{result.latency}ms</span>
                        )}
                        {result.status === 'broken' && (
                          <span className="text-red-400">Failed</span>
                        )}
                      </div>
                    </div>
                    {result.error && (
                      <div className="mt-2 text-xs text-red-400">{result.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

