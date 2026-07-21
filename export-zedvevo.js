import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = "https://vbihqdqlzyihqcbmamtf.supabase.co"
const supabaseKey = " eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaWhxZHFsenlpaHFjYm1hbXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0Nzk3ODIsImV4cCI6MjEwMDA1NTc4Mn0.y3YDnP7Wnx3h-pZwjc3nFORxBL-HXhCi3ezhM0GKSpI"


const supabase = createClient(supabaseUrl, supabaseKey)

const tables = [
  'profiles',
  'artists',
  'songs',
  'albums',
  'album_songs',
  'videos',
  'events',
  'tickets',
  'products',
  'payments',
  'notifications',
  'categories',
  'app_settings'
]

async function exportTable(table) {
  console.log(`Exporting ${table}...`)

  const { data, error } = await supabase
    .from(table)
    .select('*')

  if (error) {
    console.log(`FAILED ${table}:`, error.message)
    return
  }

  fs.writeFileSync(
    `backup_${table}.json`,
    JSON.stringify(data, null, 2)
  )

  console.log(`Saved ${table}: ${data.length} rows`)
}

async function run() {
  for (const table of tables) {
    await exportTable(table)
  }

  console.log("Export complete")
}

run()