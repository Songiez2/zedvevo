import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://vbihqdqlzyihqcbmamtf.supabase.co"
const supabaseKey =" eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaWhxZHFsenlpaHFjYm1hbXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0Nzk3ODIsImV4cCI6MjEwMDA1NTc4Mn0.y3YDnP7Wnx3h-pZwjc3nFORxBL-HXhCi3ezhM0GKSpI"

const supabase = createClient(supabaseUrl, supabaseKey)

const { data, error } = await supabase
  .from('songs')
  .select('*')
  .limit(5)

console.log("DATA:", data)
console.log("ERROR:", error)