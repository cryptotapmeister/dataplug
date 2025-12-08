'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

const ALLOWED_ADMIN_EMAILS = [
  'joseph@cryptotap.io',
  'admin@dataplug.dev',
  'joseph@dataplug.dev',
]

interface Stream {
  id: string
  name: string
  description: string
  endpoint: string
  tags?: string[]
  clicks_node?: number
  clicks_python?: number
  created_at?: string
}

export default function Home() {
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)
  const [pinging, setPinging] = useState<string>('')
  const [latencies, setLatencies] = useState<Record<string, number>>({})
  const [user, setUser] = useState<User | null>(null)
  const [totalStreams, setTotalStreams] = useState<number>(0)
  const timer = useRef<NodeJS.Timeout | null>(null)
  
  const isAdmin = user?.email && ALLOWED_ADMIN_EMAILS.includes(user.email)

  const search = useCallback(async (q: string) => {
    setLoading(true)
    
    try {
      // If query is empty, show all streams (limit 6)
      if (!q.trim()) {
        const { data, error } = await supabase
          .from('streams')
          .select('*')
          .limit(6)
        
        if (error) {
          console.error('Search error:', error.message || error)
        }
        
        setResults(data || [])
        setLoading(false)
        return
      }

      // Build search query - search name, description, and tags
      const searchTerm = q.trim()
      const searchLower = searchTerm.toLowerCase()
      
      // Fetch all streams and filter client-side
      // This approach works reliably and handles tags array search properly
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .limit(50)
      
      if (error) {
        console.error('Search error:', error.message || error)
        setResults([])
        setLoading(false)
        return
      }

      if (!data || data.length === 0) {
        setResults([])
        setLoading(false)
        return
      }

      // Filter results to check name, description, and tags
      const filtered = data.filter(stream => {
        const nameMatch = stream.name?.toLowerCase().includes(searchLower) ?? false
        const descMatch = stream.description?.toLowerCase().includes(searchLower) ?? false
        const tagMatch = Array.isArray(stream.tags) && stream.tags.some((tag: string) => 
          tag.toLowerCase().includes(searchLower)
        )
        return nameMatch || descMatch || tagMatch
      }).slice(0, 6) // Limit to 6 results

      setResults(filtered)
      setLoading(false)
    } catch (err) {
      console.error('Unexpected error in search:', err)
      setResults([])
      setLoading(false)
    }
  }, [])

  // Check auth state on mount and listen for changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch total stream count on mount
  useEffect(() => {
    const fetchTotalCount = async () => {
      const { count, error } = await supabase
        .from('streams')
        .select('*', { count: 'exact', head: true })
      
      if (!error && count !== null) {
        setTotalStreams(count)
      }
    }
    fetchTotalCount()
  }, [])

  // Initial load - fetch all streams
  useEffect(() => {
    search('')
  }, [search])

  // Debounced search when query changes
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => search(query), 300)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [query, search])

  const ping = useCallback(async (endpoint: string, id: string) => {
    setPinging(id)
    const start = Date.now()
    let ws: WebSocket | null = null
    let timeoutId: NodeJS.Timeout | null = null

    try {
      ws = new WebSocket(endpoint)
      
      // Set 3-second timeout
      timeoutId = setTimeout(() => {
        if (ws && ws.readyState === WebSocket.CONNECTING) {
          ws.close()
          setLatencies(prev => ({ ...prev, [id]: 3000 }))
          setPinging('')
        }
      }, 3000)

      ws.onopen = () => {
        if (timeoutId) clearTimeout(timeoutId)
        const latency = Date.now() - start
        setLatencies(prev => ({ ...prev, [id]: latency }))
        ws?.close()
        setPinging('')
      }

      ws.onerror = () => {
        if (timeoutId) clearTimeout(timeoutId)
        setLatencies(prev => ({ ...prev, [id]: 9999 }))
        setPinging('')
      }

      ws.onclose = () => {
        if (timeoutId) clearTimeout(timeoutId)
        if (pinging === id) {
          setPinging('')
        }
      }
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)
      setLatencies(prev => ({ ...prev, [id]: 9999 }))
      setPinging('')
    }
  }, [pinging])

  const handleSignIn = useCallback(async () => {
    const email = prompt('Enter your email:')
    if (!email) return

    const redirectUrl = `${window.location.origin}/auth/callback`
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    })

    if (error) {
      alert(`Error: ${error.message}`)
    } else {
      alert('Check your email for magic link!')
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const copy = useCallback(async (endpoint: string, id: string, type: 'node' | 'python') => {
    const nodeCode = `const WebSocket = require('ws');
const ws = new WebSocket('${endpoint}');

ws.on('open', () => {
  console.log('Connected');
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('error', (error) => {
  console.error('Error:', error);
});`

    const pythonCode = `import websocket
import json

def on_message(ws, message):
    print(f"Received: {message}")

def on_error(ws, error):
    print(f"Error: {error}")

def on_open(ws):
    print("Connected")

ws = websocket.WebSocketApp(
    "${endpoint}",
    on_message=on_message,
    on_error=on_error,
    on_open=on_open
)
ws.run_forever()`

    const code = type === 'node' ? nodeCode : pythonCode

    try {
      await navigator.clipboard.writeText(code)
      toast.success('📋 Copied!')
      // Track click - but skip if on admin page
      if (pathname !== '/admin') {
        fetch('/api/click', {
          method: 'POST',
          body: JSON.stringify({ id, type }),
          headers: { 'Content-Type': 'application/json' },
        })
          .then(res => res.json())
          .then(data => {
            if (!data.success) {
              console.error('Click tracking failed:', data.error)
            }
          })
          .catch(err => {
            console.error('Click tracking error:', err)
          })
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      toast.error('Failed to copy')
    }
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
      {/* Auth UI - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-white text-sm">
              Welcome @{user.email?.split('@')[0]}
            </span>
            {isAdmin && (
              <Link
                href="/admin"
                className="px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200"
                style={{
                  border: '1px solid rgba(0, 255, 255, 0.4)',
                  color: 'rgba(0, 255, 255, 0.9)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.6)'
                  e.currentTarget.style.backdropFilter = 'blur(10px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)'
                  e.currentTarget.style.backdropFilter = 'none'
                }}
              >
                Admin
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
              style={{
                border: '1px solid rgba(0, 255, 255, 0.4)',
                color: 'rgba(0, 255, 255, 0.9)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.6)'
                e.currentTarget.style.backdropFilter = 'blur(10px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)'
                e.currentTarget.style.backdropFilter = 'none'
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
            style={{
              border: '1px solid rgba(0, 255, 255, 0.4)',
              color: 'rgba(0, 255, 255, 0.9)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.6)'
              e.currentTarget.style.backdropFilter = 'blur(10px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)'
              e.currentTarget.style.backdropFilter = 'none'
            }}
          >
            Sign in
          </button>
        )}
      </div>

      <div className="container mx-auto px-6 py-16">
        <h1 className="text-center text-7xl font-black mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          DataPlug
        </h1>
        <p className="text-center text-2xl text-gray-400 mb-12">
          Real-time data streams for crypto, social, finance, weather, gaming, AI and everything else
        </p>

        <div className="max-w-2xl mx-auto mb-16">
          <Input
            placeholder="e.g. solana mempool, github stars, spotify playing, earthquake"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="h-16 text-xl text-white placeholder:text-gray-500"
            style={{
              backgroundColor: '#0f0f0f',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              borderRadius: '12px',
              boxShadow: 'inset 0 0 20px rgba(0, 255, 255, 0.05)',
            }}
          />
        </div>
        <p className="text-center text-gray-500 mt-8">
          {totalStreams} streams • Request anything • Built by @0xJosephK
        </p>

        <div className="grid gap-8 max-w-5xl mx-auto">
          {loading ? (
            <p className="text-center text-2xl text-white">Loading…</p>
          ) : results.length === 0 ? (
            <p className="text-center text-xl text-gray-500 text-center">
              No streams found —{' '}
              <a
                href={`https://x.com/messages/compose?recipient_id=1088466265&text=Hey%20@0xJosephK%20—%20can%20you%20add%20a%20stream%20for%20"${encodeURIComponent(query)}"?`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 font-medium"
              >
                click here to request it
              </a>
            </p>
          ) : (
            results.map(s => (
              <div
                key={s.id}
                className="rounded-3xl transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'rgba(30, 30, 40, 0.6)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 255, 255, 0.2)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 255, 255, 0.15), 0 0 0 1px rgba(0, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-2xl font-semibold text-white mb-2">{s.name}</h3>
                    <p className="text-gray-300">{s.description}</p>
                  </div>
                  <div className="mb-6">
                    <code className="block text-sm text-cyan-300 break-all font-mono">
                      {s.endpoint}
                    </code>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => ping(s.endpoint, s.id)}
                      disabled={pinging === s.id}
                      className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        border: '1px solid rgba(0, 255, 255, 0.4)',
                        color: 'rgba(0, 255, 255, 0.9)',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'
                          e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.6)'
                          e.currentTarget.style.backdropFilter = 'blur(10px)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)'
                        e.currentTarget.style.backdropFilter = 'none'
                      }}
                    >
                      {pinging === s.id ? 'Pinging…' : latencies[s.id] ? `${latencies[s.id]}ms` : 'Ping'}
                    </button>
                    <button
                      onClick={() => copy(s.endpoint, s.id, 'node')}
                      className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                      style={{
                        border: '1px solid rgba(0, 255, 255, 0.4)',
                        color: 'rgba(0, 255, 255, 0.9)',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.6)'
                        e.currentTarget.style.backdropFilter = 'blur(10px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)'
                        e.currentTarget.style.backdropFilter = 'none'
                      }}
                    >
                      Copy Node.js
                    </button>
                    <button
                      onClick={() => copy(s.endpoint, s.id, 'python')}
                      className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                      style={{
                        border: '1px solid rgba(0, 255, 255, 0.4)',
                        color: 'rgba(0, 255, 255, 0.9)',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.6)'
                        e.currentTarget.style.backdropFilter = 'blur(10px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)'
                        e.currentTarget.style.backdropFilter = 'none'
                      }}
                    >
                      Copy Python
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
