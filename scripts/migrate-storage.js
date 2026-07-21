import { createClient } from '@supabase/supabase-js'

const oldSupabase = createClient(
  "https://vbihqdqlzyihqcbmamtf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaWhxZHFsenlpaHFjYm1hbXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0Nzk3ODIsImV4cCI6MjEwMDA1NTc4Mn0.y3YDnP7Wnx3h-pZwjc3nFORxBL-HXhCi3ezhM0GKSpI"
)

const newSupabase = createClient(
  "https://hhzezihvwascxqyxuvmd.supabase.co",
  "REMOVED_SECRETULx7TG7UrmPowfJ3v4vvmQ_tty11YbT"
)

const buckets = [
  "music",
  "albums",
  "profiles",
  "artists",
  "videos",
  "images"
]


async function listFiles(bucket, path = '') {

  const { data, error } = await oldSupabase
    .storage
    .from(bucket)
    .list(path, {
      limit: 1000
    })

  if (error) {
    console.log(error.message)
    return []
  }

  let files = []

  for (const item of data) {

    const fullPath = path
      ? `${path}/${item.name}`
      : item.name

    // folders have no id
    if (!item.id) {
      const inside = await listFiles(bucket, fullPath)
      files.push(...inside)
    } else {
      files.push(fullPath)
    }
  }

  return files
}


async function copyBucket(bucket) {

  console.log(`\nBUCKET: ${bucket}`)

  const files = await listFiles(bucket)

  console.log(`Found ${files.length} files`)

  for (const file of files) {

    console.log(`Copying ${file}`)

    const { data, error } =
      await oldSupabase
        .storage
        .from(bucket)
        .download(file)

    if (error) {
      console.log("DOWNLOAD FAILED:", error.message)
      continue
    }


    const { error: uploadError } =
      await newSupabase
        .storage
        .from(bucket)
        .upload(file, data, {
          upsert: true
        })

    if (uploadError) {
      console.log("UPLOAD FAILED:", uploadError.message)
    } else {
      console.log("DONE:", file)
    }
  }
}


async function run() {

  for (const bucket of buckets) {
    await copyBucket(bucket)
  }

  console.log("\nStorage migration complete")
}


run()