import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rrmvpaiscnxeildyufmk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJybXZwYWlzY254ZWlsZHl1Zm1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzE2OTgsImV4cCI6MjA3OTUwNzY5OH0.lll6ka__K2gO3XjpVAUx06lT5fHlcyfUdqGVP-2hDwc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)