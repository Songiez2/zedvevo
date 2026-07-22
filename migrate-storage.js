require('dotenv').config()
import { createClient } from '@supabase/supabase-js'


const OLD_SUPABASE_URL = "https://vbihqdqlzyihqcbmamtf.supabase.co"
const OLD_SERVICE_ROLE_KEY = const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY


const NEW_SUPABASE_URL = "https://hhzezihvwascxqyxuvmd.supabase.co"
const NEW_SERVICE_ROLE_KEY =const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY


const oldSupabase = createClient(
  OLD_SUPABASE_URL,
  OLD_SERVICE_ROLE_KEY
)

const newSupabase = createClient(
  NEW_SUPABASE_URL,
  NEW_SERVICE_ROLE_KEY
)


const buckets = [
  "music",
  "albums"
]


async function listFiles(bucket, folder = "") {

  const { data, error } =
    await oldSupabase.storage
      .from(bucket)
      .list(folder, {
        limit: 1000
      })


  if (error) {
    console.log(error.message)
    return []
  }


  let files = []


  for (const item of data) {

    const path = folder
      ? `${folder}/${item.name}`
      : item.name


    // folder
    if (!item.metadata) {

      const inside = await listFiles(
        bucket,
        path
      )

      files.push(...inside)

    } else {

      files.push(path)

    }

  }


  return files
}



async function migrateBucket(bucket) {

  console.log("\nBucket:", bucket)


  const files = await listFiles(bucket)


  console.log(
    "Files found:",
    files
  )


  for (const filePath of files) {


    console.log(
      "Copying:",
      filePath
    )


    const { data, error } =
      await oldSupabase.storage
        .from(bucket)
        .download(filePath)


    if(error){

      console.log(
        "DOWNLOAD FAILED:",
        error.message
      )

      continue
    }


    const { error: uploadError } =
      await newSupabase.storage
        .from(bucket)
        .upload(
          filePath,
          data,
          {
            upsert:true
          }
        )


    if(uploadError){

      console.log(
        "UPLOAD FAILED:",
        uploadError.message
      )

    } else {

      console.log(
        "DONE:",
        filePath
      )

    }

  }

}



async function run(){

 console.log("Starting storage migration...")


 for(const bucket of buckets){

   await migrateBucket(bucket)

 }


 console.log(
  "\nSTORAGE MIGRATION COMPLETE"
 )

}


run()