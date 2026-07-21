import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = "https://hhzezihvwascxqyxuvmd.supabase.co"
const supabaseKey = "REMOVED_SECRETULx7TG7UrmPowfJ3v4vvmQ_tty11YbT"

const supabase = createClient(supabaseUrl, supabaseKey)

const tables = [
  'categories',
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
  'app_settings'
]

async function importTable(table) {
  const file = `backup_${table}.json`

  if (!fs.existsSync(file)) {
    console.log(`Missing ${file}`)
    return
  }

  let rows = JSON.parse(fs.readFileSync(file, 'utf8'))

  if (!rows.length) {
    console.log(`Skipping ${table}, empty`)
    return
  }

  // Fix app_settings null values
  if (table === 'app_settings') {
    rows = rows.map(row => ({
      ...row,
      value: row.value === null ? "" : row.value
    }))
  }

  console.log(`Importing ${table}: ${rows.length} rows`)

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {

      let conflictColumn = 'id'

      // app_settings uses key instead of id
      if (table === 'app_settings') {
        conflictColumn = 'key'
      }

      const { error } = await supabase
        .from(table)
        .upsert(rows, {
          onConflict: conflictColumn
        })

      if (!error) {
        console.log(`DONE ${table}`)
        return
      }

      console.log(`Attempt ${attempt} failed: ${error.message}`)

    } catch (err) {
      console.log(`Attempt ${attempt} network error: ${err.message}`)
    }

    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  console.log(`FAILED ${table}`)
}

async function run() {
  for (const table of tables) {
    await importTable(table)
  }

  console.log("Import finished")
}

run()