require('dotenv').config()
import { createClient } from '@supabase/supabase-js'


const supabase = createClient(
  "https://hhzezihvwascxqyxuvmd.supabase.co",
  const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function updateSongs(){

  const { data: songs, error } =
    await supabase
      .from("songs")
      .select("id,audio_url,cover_url")


  if(error){
    console.log(error.message)
    return
  }


  for(const song of songs){

    let audio = song.audio_url
    let cover = song.cover_url


    if(audio){
      audio = audio.replace(
        "vbihqdqlzyihqcbmamtf.supabase.co",
        "hhzezihvwascxqyxuvmd.supabase.co"
      )
    }


    if(cover){
      cover = cover.replace(
        "vbihqdqlzyihqcbmamtf.supabase.co",
        "hhzezihvwascxqyxuvmd.supabase.co"
      )
    }


    const { error:updateError } =
      await supabase
        .from("songs")
        .update({
          audio_url: audio,
          cover_url: cover
        })
        .eq(
          "id",
          song.id
        )


    if(updateError){
      console.log(
        "FAILED:",
        updateError.message
      )
    }
    else{
      console.log(
        "UPDATED:",
        song.id
      )
    }

  }

}


updateSongs()