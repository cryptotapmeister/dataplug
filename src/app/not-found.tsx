import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
      <div className="text-center px-6">
        <h1 className="text-9xl font-black text-white mb-4">404</h1>
        <h2 className="text-3xl font-bold text-gray-300 mb-6">Page Not Found</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 text-lg font-medium rounded-lg transition-all duration-200"
          style={{
            border: '1px solid rgba(0, 255, 255, 0.4)',
            color: 'rgba(0, 255, 255, 0.9)',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'
            e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.6)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)'
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
