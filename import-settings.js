require('dotenv').config()
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = "https://hhzezihvwascxqyxuvmd.supabase.co"

// PUT YOUR NEW PROJECT SERVICE ROLE KEY HERE
const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(
  supabaseUrl,
  supabaseKey
)

async function importSettings() {

  console.log("Reading backup_app_settings.json...")

  let data = JSON.parse(
    fs.readFileSync("backup_app_settings.json", "utf8")
  )

  // Fix NULL values because new database requires value
  data = data.map(item => ({
    key: item.key,
    value: item.value === null ? "" : item.value,
    updated_at: item.updated_at
  }))

  console.log(`Importing ${data.length} settings...`)

  const { error } = await supabase
    .from("app_settings")
    .upsert(data, {
      onConflict: "key"
    })

  if (error) {
    console.log("IMPORT FAILED:")
    console.log(error.message)
    return
  }

  console.log("SUCCESS: app_settings imported")
}

importSettings()