import { supabase } from "@/lib/supabase";
import type { ExternalMusic } from "@/types/types";

export async function getSongs(options?: {
  genre?: string;
  limit?: number;
}) {

  let query = supabase
    .from("songs")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending:false });


  if(options?.genre){
    query = query.eq("genre", options.genre);
  }


  if(options?.limit){
    query = query.limit(options.limit);
  }


  const {data,error}=await query;


  if(error){
    console.error(error);
    return [];
  }


  return data.map(songToExternalMusic);

}



export async function getTrendingSongs(limit=12){

 const {data,error}=await supabase
 .from("songs")
 .select("*")
 .eq("published",true)
 .order("plays",{ascending:false})
 .limit(limit);


 if(error){
   console.error(error);
   return [];
 }


 return data.map(songToExternalMusic);

}



export async function getNewReleases(limit=12){

 const {data,error}=await supabase
 .from("songs")
 .select("*")
 .eq("published",true)
 .order("created_at",{ascending:false})
 .limit(limit);


 if(error){
   console.error(error);
   return [];
 }


 return data.map(songToExternalMusic);

}



export function songToExternalMusic(song:any):ExternalMusic{

 return {

   id:song.id,

   external_id:song.id,

   title:song.title,

   artist:
   song.artist_display_name ||
   song.artist ||
   "Unknown Artist",


   album:
   song.album_id || null,


   cover:
   song.cover_url || null,


   audio_url:
   song.audio_url,


   genre:
   song.genre || null,


   source:
   "zedvevo",


   duration:
   song.duration || null,


   plays:
   song.plays || 0,


   downloads:
   song.downloads || 0,


   is_premium:
   song.is_premium || false,


   price:
   song.price || null,


   created_at:
   song.created_at

 };

}