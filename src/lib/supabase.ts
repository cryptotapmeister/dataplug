// src/lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

// IMPORTANT: Use the ANON/PUBLIC key for client-side, NOT the secret key!
// Secret keys should NEVER be used in browser code - they're for server-side only
// Get your anon key from: Supabase Dashboard > Settings > API > Project API keys > anon public
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opyjczovxdblqrlnuzcz.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Validate the API key (only warn, don't throw - allow app to load)
if (!supabaseAnonKey || supabaseAnonKey === 'REPLACE_WITH_YOUR_ANON_KEY_HERE') {
  // Use setTimeout to ensure this runs after initial render
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      console.error(
        '%c❌ SUPABASE ANON KEY NOT CONFIGURED',
        'color: red; font-size: 16px; font-weight: bold;'
      )
      console.error(
        'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set or still has placeholder!\n\n' +
        '📋 To fix this:\n' +
        '1. Go to: https://supabase.com/dashboard/project/_/settings/api\n' +
        '2. Copy the "anon public" key (starts with "eyJ")\n' +
        '3. Open .env.local in your project root\n' +
        '4. Replace REPLACE_WITH_YOUR_ANON_KEY_HERE with your actual anon key\n' +
        '5. Restart your dev server: npm run dev\n\n' +
        'The anon key should look like: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weWpjem92eGRibHFybG51emN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2MjE2MDAsImV4cCI6MjA0OTE5NzYwMH0.xxxxx'
      )
    }, 100)
  }
}

// Validate that we're not using a secret key
if (supabaseAnonKey && supabaseAnonKey.startsWith('sb_secret_')) {
  if (typeof window !== 'undefined') {
    console.error(
      '❌ SECURITY ERROR: You are using a SECRET key in browser code!\n\n' +
      'Secret keys (starting with "sb_secret_") should NEVER be used in client-side code.\n\n' +
      'To fix this:\n' +
      '1. Go to Supabase Dashboard > Settings > API\n' +
      '2. Copy the "anon public" key (starts with "eyJ")\n' +
      '3. Update .env.local: NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here\n' +
      '4. Restart your dev server (npm run dev)'
    )
  }
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)