import { createClient } from '@supabase/supabase-js'

// TODO: Replace with environment variables for security
const supabaseUrl = 'https://hwadpgrstlrmpvkntopf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3YWRwZ3JzdGxybXB2a250b3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NDU4ODIsImV4cCI6MjA1OTUyMTg4Mn0.jsIJtQEEJ-VAyaeApLx_dKl7xRDJv84dnZilEyaVhnE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)