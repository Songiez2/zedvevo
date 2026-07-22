require('dotenv').config()
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = "https://hhzezihvwascxqyxuvmd.supabase.co"
const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const tables = [
  'categories',
  'app_settings',
  'profiles',
  'artists',
  'songs'
]

async function importTable(table) {
  const file = `backup_${table}.json`

  const data = JSON.parse(
    fs.readFileSync(file, 'utf8')
  )

  if (!data.length) {
    console.log(`SKIP ${table} (empty)`)
    return
  }

  console.log(`Importing ${table}: ${data.length}`)

  const { error } = await supabase
    .from(table)
    .upsert(data)

  if (error) {
    console.log(`ERROR ${table}:`, error.message)
  } else {
    console.log(`DONE ${table}`)
  }
}

async function run() {
  for (const table of tables) {
    await importTable(table)
  }
}

run()