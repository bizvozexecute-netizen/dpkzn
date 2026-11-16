import {readFile} from "node:fs/promises";
import path from "node:path";
import {photoDir} from "@/lib/lead-photos";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))return new Response(null,{status:404});
  try{return new Response(new Uint8Array(await readFile(path.join(photoDir(),id+".webp"))),{headers:{"Content-Type":"image/webp","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}catch{return new Response(null,{status:404});}
}
