'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

const ALLOWED_ADMIN_EMAILS = [
  'joseph@cryptotap.io',
  'admin@dataplug.dev',
  'joseph@dataplug.dev',
]

interface StreamData {
  id: string
  name: string
  endpoint: string
  clicks_node: number
  clicks_python: number
  total: number
}

type SortColumn = 'id' | 'name' | 'endpoint' | 'clicks_node' | 'clicks_python' | 'total'

export default function StreamsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [streams, setStreams] = useState<StreamData[]>([])
  const [sortBy, setSortBy] = useState<SortColumn>('total')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Check auth and admin access
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        router.push('/')
        return
      }

      const userEmail = session.user.email
      if (!userEmail || !ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
        toast.error('Admin access denied')
        router.push('/')
        return
      }

      setUser(session.user)
      setLoading(false)
    }

    checkAccess()
  }, [router])

  // Fetch all streams
  useEffect(() => {
    if (!user) return

    const fetchStreams = async () => {
      try {
        const { data, error } = await supabase
          .from('streams')
          .select('id, name, endpoint, clicks_node, clicks_python')
          .order('name')

        if (error) {
          console.error('Error fetching streams:', error)
          return
        }

        const streamData: StreamData[] = (data || []).map(stream => ({
          id: stream.id,
          name: stream.name,
          endpoint: stream.endpoint,
          clicks_node: stream.clicks_node || 0,
          clicks_python: stream.clicks_python || 0,
          total: (stream.clicks_node || 0) + (stream.clicks_python || 0),
        }))

        setStreams(streamData)
      } catch (error) {
        console.error('Error fetching streams:', error)
      }
    }

    fetchStreams()
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const sortedStreams = [...streams].sort((a, b) => {
    let aVal: string | number
    let bVal: string | number

    switch (sortBy) {
      case 'id':
        aVal = a.id
        bVal = b.id
        break
      case 'name':
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
        break
      case 'endpoint':
        aVal = a.endpoint.toLowerCase()
        bVal = b.endpoint.toLowerCase()
        break
      case 'clicks_node':
        aVal = a.clicks_node
        bVal = b.clicks_node
        break
      case 'clicks_python':
        aVal = a.clicks_python
        bVal = b.clicks_python
        break
      case 'total':
        aVal = a.total
        bVal = b.total
        break
      default:
        return 0
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    } else {
      return sortOrder === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
      {/* Top-left: Back to admin */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/admin"
          className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
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
          <span>←</span>
          <span>Admin</span>
        </Link>
      </div>

      {/* Top-right navigation */}
      <div className="absolute top-6 right-6 z-10">
        <div className="flex items-center gap-4">
          <span className="text-white text-sm">
            Welcome @{user?.email?.split('@')[0]}
          </span>
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
      </div>

      <div className="container mx-auto px-6 py-20">
        <h1 className="text-center text-7xl md:text-8xl font-black mb-16 text-white">
          All Streams
        </h1>

        {/* Streams Table - Premium Style */}
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
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div
                    className="col-span-1 text-cyan-300 font-semibold cursor-pointer hover:text-cyan-200 transition-colors text-sm uppercase tracking-wide"
                    onClick={() => handleSort('id')}
                  >
                    ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                  <div
                    className="col-span-3 text-cyan-300 font-semibold cursor-pointer hover:text-cyan-200 transition-colors text-sm uppercase tracking-wide"
                    onClick={() => handleSort('name')}
                  >
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                  <div
                    className="col-span-4 text-cyan-300 font-semibold cursor-pointer hover:text-cyan-200 transition-colors text-sm uppercase tracking-wide"
                    onClick={() => handleSort('endpoint')}
                  >
                    Endpoint {sortBy === 'endpoint' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                  <div
                    className="col-span-1 text-right text-cyan-300 font-semibold cursor-pointer hover:text-cyan-200 transition-colors text-sm uppercase tracking-wide"
                    onClick={() => handleSort('clicks_node')}
                  >
                    Node.js {sortBy === 'clicks_node' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                  <div
                    className="col-span-1 text-right text-cyan-300 font-semibold cursor-pointer hover:text-cyan-200 transition-colors text-sm uppercase tracking-wide"
                    onClick={() => handleSort('clicks_python')}
                  >
                    Python {sortBy === 'clicks_python' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                  <div
                    className="col-span-2 text-right text-cyan-300 font-semibold cursor-pointer hover:text-cyan-200 transition-colors text-sm uppercase tracking-wide"
                    onClick={() => handleSort('total')}
                  >
                    Total {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                </div>
              </div>

              {/* Rows */}
              {sortedStreams.map((stream) => (
                <div
                  key={stream.id}
                  className="p-6 hover:bg-cyan-500/5 transition-colors"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1 text-gray-400 font-mono text-sm">{stream.id}</div>
                    <div className="col-span-3 text-white font-medium">{stream.name}</div>
                    <div className="col-span-4 text-gray-300 font-mono text-sm break-all">{stream.endpoint}</div>
                    <div className="col-span-1 text-right text-gray-300">{stream.clicks_node}</div>
                    <div className="col-span-1 text-right text-gray-300">{stream.clicks_python}</div>
                    <div className="col-span-2 text-right text-cyan-300 font-bold">{stream.total}</div>
                  </div>
                </div>
              ))}

              {sortedStreams.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  No streams found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

