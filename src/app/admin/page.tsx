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

      <div className="container mx-auto px-6 py-16">
        <h1 className="text-center text-6xl md:text-7xl font-black mb-12 text-white">
          DataPlug Admin
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
          {/* Total Users */}
          <div
            className="rounded-3xl p-6 transition-all duration-300"
            style={{
              background: 'rgba(30, 30, 40, 0.6)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <h3 className="text-gray-400 text-sm mb-2">Total Registered Users</h3>
            <p className="text-4xl font-bold text-white">{users.length}</p>
            <p className="text-xs text-gray-500 mt-2">Note: Requires admin API access to fetch auth.users</p>
          </div>

          {/* Total Streams */}
          <div
            className="rounded-3xl p-6 transition-all duration-300"
            style={{
              background: 'rgba(30, 30, 40, 0.6)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <h3 className="text-gray-400 text-sm mb-2">Total Streams</h3>
            <p className="text-4xl font-bold text-white">{streams.length}</p>
          </div>
        </div>

        {/* Most Popular Streams */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Most Popular Streams</h2>
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(30, 30, 40, 0.6)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan-500/20">
                  <th className="text-left p-4 text-cyan-300 font-semibold">Stream Name</th>
                  <th className="text-right p-4 text-cyan-300 font-semibold">Total Copies</th>
                  <th className="text-right p-4 text-cyan-300 font-semibold">Node.js</th>
                  <th className="text-right p-4 text-cyan-300 font-semibold">Python</th>
                </tr>
              </thead>
              <tbody>
                {streams.map((stream, index) => (
                  <tr
                    key={stream.id}
                    className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors"
                  >
                    <td className="p-4 text-white font-medium">{stream.name}</td>
                    <td className="p-4 text-right text-cyan-300 font-bold">{stream.total}</td>
                    <td className="p-4 text-right text-gray-300">{stream.clicks_node}</td>
                    <td className="p-4 text-right text-gray-300">{stream.clicks_python}</td>
                  </tr>
                ))}
                {streams.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      No streams found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users Table */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">All Users</h2>
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(30, 30, 40, 0.6)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan-500/20">
                  <th
                    className="text-left p-4 text-cyan-300 font-semibold cursor-pointer hover:text-cyan-200 transition-colors"
                    onClick={() => handleSort('email')}
                  >
                    Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left p-4 text-cyan-300 font-semibold cursor-pointer hover:text-cyan-200 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    Created At {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((userData) => (
                  <tr
                    key={userData.id}
                    className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors"
                  >
                    <td className="p-4 text-white">{userData.email}</td>
                    <td className="p-4 text-gray-300">
                      {new Date(userData.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {sortedUsers.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-gray-500">
                      No users found. Note: Fetching auth.users requires Supabase Admin API access.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

