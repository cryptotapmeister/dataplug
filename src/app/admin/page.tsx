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

interface UserData {
  id: string
  email: string
  created_at: string
}

interface StreamStats {
  id: string
  name: string
  clicks_node: number
  clicks_python: number
  total: number
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserData[]>([])
  const [streams, setStreams] = useState<StreamStats[]>([])
  const [sortBy, setSortBy] = useState<'email' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const handleStreamsClick = () => {
    router.push('/admin/streams')
  }

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

  // Fetch users
  useEffect(() => {
    if (!user) return

    const fetchUsers = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const response = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          console.error('Failed to fetch users:', response.statusText)
          return
        }

        const { users: userData } = await response.json()
        setUsers(userData || [])
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    fetchUsers()
  }, [user])

  // Fetch stream statistics
  useEffect(() => {
    if (!user) return

    const fetchStreams = async () => {
      try {
        const { data, error } = await supabase
          .from('streams')
          .select('id, name, clicks_node, clicks_python')
          .order('name')

        if (error) {
          console.error('Error fetching streams:', error)
          return
        }

        const streamStats: StreamStats[] = (data || []).map(stream => ({
          id: stream.id,
          name: stream.name,
          clicks_node: stream.clicks_node || 0,
          clicks_python: stream.clicks_python || 0,
          total: (stream.clicks_node || 0) + (stream.clicks_python || 0),
        }))
          .sort((a, b) => b.total - a.total)

        setStreams(streamStats)
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

  const handleSort = (column: 'email' | 'created_at') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    )
  }

  const sortedUsers = [...users].sort((a, b) => {
    const aVal = sortBy === 'email' ? a.email : a.created_at
    const bVal = sortBy === 'email' ? b.email : b.created_at
    return sortOrder === 'asc' 
      ? aVal.localeCompare(bVal)
      : bVal.localeCompare(aVal)
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
      {/* Top-left: Back to home */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/"
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
          <span>Home</span>
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
          DataPlug Admin
        </h1>

        {/* Stats Cards - Premium Vision Pro Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-7xl mx-auto">
          {/* Total Users */}
          <div
            className="rounded-3xl p-8 transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'rgba(30, 30, 40, 0.7)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              boxShadow: '0 12px 48px rgba(0, 255, 255, 0.1), 0 0 0 1px rgba(0, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 16px 64px rgba(0, 255, 255, 0.2), 0 0 0 1px rgba(0, 255, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 255, 255, 0.1), 0 0 0 1px rgba(0, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
              e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.3)'
            }}
          >
            <h3 className="text-cyan-400 text-sm font-medium mb-4 tracking-wide uppercase">Total Registered Users</h3>
            <p className="text-7xl md:text-8xl font-black text-white mb-2 leading-none">{users.length}</p>
            <p className="text-xs text-gray-500 mt-4">Note: Requires admin API access to fetch auth.users</p>
          </div>

          {/* Total Copies */}
          <div
            className="rounded-3xl p-8 transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'rgba(30, 30, 40, 0.7)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              boxShadow: '0 12px 48px rgba(0, 255, 255, 0.1), 0 0 0 1px rgba(0, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 16px 64px rgba(0, 255, 255, 0.2), 0 0 0 1px rgba(0, 255, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 255, 255, 0.1), 0 0 0 1px rgba(0, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
              e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.3)'
            }}
          >
            <h3 className="text-cyan-400 text-sm font-medium mb-4 tracking-wide uppercase">Total Copies</h3>
            <p className="text-7xl md:text-8xl font-black text-white mb-2 leading-none">
              {streams.reduce((sum, s) => sum + s.total, 0)}
            </p>
            <p className="text-xs text-gray-500 mt-4">Across all streams</p>
          </div>

          {/* Total Number of Streams - Clickable */}
          <div
            className="rounded-3xl p-8 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            onClick={handleStreamsClick}
            style={{
              background: 'rgba(30, 30, 40, 0.7)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              boxShadow: '0 12px 48px rgba(0, 255, 255, 0.1), 0 0 0 1px rgba(0, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 16px 64px rgba(0, 255, 255, 0.2), 0 0 0 1px rgba(0, 255, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 255, 255, 0.1), 0 0 0 1px rgba(0, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
              e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.3)'
            }}
          >
            <h3 className="text-cyan-400 text-sm font-medium mb-4 tracking-wide uppercase">Total Number of Streams</h3>
            <p className="text-7xl md:text-8xl font-black text-white mb-2 leading-none">{streams.length}</p>
            <p className="text-xs text-gray-500 mt-4">Click to view all</p>
          </div>
        </div>

        {/* Top 10 Most Popular Streams - Premium Leaderboard */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-8 text-center">Top 10 Streams</h2>
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
              {streams.slice(0, 10).map((stream, index) => {
                const rank = index + 1
                const isTop3 = rank <= 3
                return (
                  <div
                    key={stream.id}
                    className="p-6 hover:bg-cyan-500/5 transition-all duration-200"
                    style={{
                      background: isTop3 ? 'rgba(0, 255, 255, 0.03)' : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-6">
                      {/* Rank Badge */}
                      <div
                        className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg"
                        style={{
                          background: isTop3
                            ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(0, 255, 255, 0.1))'
                            : 'rgba(30, 30, 40, 0.8)',
                          border: isTop3
                            ? '1px solid rgba(0, 255, 255, 0.5)'
                            : '1px solid rgba(0, 255, 255, 0.2)',
                          color: isTop3 ? 'rgba(0, 255, 255, 1)' : 'rgba(255, 255, 255, 0.7)',
                          boxShadow: isTop3
                            ? '0 4px 16px rgba(0, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                            : 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {rank}
                      </div>

                      {/* Stream Name */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white truncate">{stream.name}</h3>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-8 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-2xl font-black text-cyan-300">{stream.total}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-300">{stream.clicks_node}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Node.js</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-300">{stream.clicks_python}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Python</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {streams.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  No streams found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Users Table - Premium Style */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-8 text-center">All Users</h2>
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
              <div
                className="p-6 border-b border-cyan-500/20"
                style={{
                  background: 'rgba(0, 255, 255, 0.05)',
                }}
              >
                <div className="flex items-center gap-6">
                  <div
                    className="text-left flex-1 text-cyan-300 font-semibold cursor-pointer hover:text-cyan-200 transition-colors text-sm uppercase tracking-wide"
                    onClick={() => handleSort('email')}
                  >
                    Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                  <div
                    className="text-left flex-1 text-cyan-300 font-semibold cursor-pointer hover:text-cyan-200 transition-colors text-sm uppercase tracking-wide"
                    onClick={() => handleSort('created_at')}
                  >
                    Created At {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                </div>
              </div>
              {sortedUsers.map((userData) => (
                <div
                  key={userData.id}
                  className="p-6 hover:bg-cyan-500/5 transition-colors"
                >
                  <div className="flex items-center gap-6">
                    <div className="flex-1 text-white font-medium">{userData.email}</div>
                    <div className="flex-1 text-gray-300">
                      {new Date(userData.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              {sortedUsers.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  No users found. Note: Fetching auth.users requires Supabase Admin API access.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

