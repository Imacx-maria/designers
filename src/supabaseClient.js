import { createClient } from '@supabase/supabase-js'

// TODO: Replace with environment variables for security
const supabaseUrl = 'https://hwadpgrstlrmpvkntopf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3YWRwZ3JzdGxybXB2a250b3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NDU4ODIsImV4cCI6MjA1OTUyMTg4Mn0.jsIJtQEEJ-VAyaeApLx_dKl7xRDJv84dnZilEyaVhnE'

// Create a single client instance with debug enabled
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
  realtime: {
    debug: true, // Enable debug logs for realtime subscriptions
  }
})

// Add a test function to verify connection
export const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...')
    const { data, error, count } = await supabase
      .from('designers')
      .select('*', { count: 'exact' })
    
    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }
    
    console.log(`Supabase connection successful, found ${count} designers:`, data)
    return true
  } catch (err) {
    console.error('Exception testing Supabase connection:', err)
    return false
  }
}