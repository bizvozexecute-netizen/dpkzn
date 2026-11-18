import sharp from "sharp";
import {mkdir,writeFile,unlink,statfs,readFile} from "node:fs/promises";
import path from "node:path";
import {randomUUID} from "node:crypto";
export const photoDir=()=>path.join(process.env.LEADS_DATA_DIR||path.join(process.cwd(),"data"),"lead-photos");
export type LeadPhoto={id:string;url:string};
export async function removePhotos(photos:LeadPhoto[]) {
  await Promise.all(photos.map(p=>unlink(path.join(photoDir(),p.id+".webp")).catch(()=>{})));
}
export async function savePhotos(files:File[]):Promise<LeadPhoto[]> {
  if(files.length>4) throw new Error("Можно прикрепить не больше 4 фото.");
  const encoded:Buffer[]=[];
  for(const file of files){
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>3*1024*1024||!file.size) throw new Error("Фото должно быть JPG, PNG или WebP, до 3 МБ.");
    try {
      const input=Buffer.from(await file.arrayBuffer());
      const meta=await sharp(input,{limitInputPixels:40000000}).metadata();
      if(!["jpeg","png","webp"].includes(meta.format||"")||(meta.pages||1)>1) throw new Error();
      encoded.push(await sharp(input,{limitInputPixels:40000000}).rotate().resize(1600,1600,{fit:"inside",withoutEnlargement:true}).webp({quality:80}).toBuffer());
    }catch{throw new Error("Не удалось прочитать фото. Выберите другой JPG, PNG или WebP.");}
  }
  const photos:LeadPhoto[]=[];
  if(!encoded.length)return photos;
  await mkdir(photoDir(),{recursive:true,mode:0o700});
  const disk=await statfs(photoDir());
  if(disk.bavail*disk.bsize<150*1024*1024)throw new Error("Сейчас не удалось сохранить фото. Попробуйте позже.");
  try{
    for(const buffer of encoded){
      const id=randomUUID();photos.push({id,url:"/api/admin/lead-photos/"+id});
      await writeFile(path.join(photoDir(),id+".webp"),buffer,{flag:"wx",mode:0o600});
    }
    return photos;
  }catch(e){await removePhotos(photos);throw e;}
}
/** JPEG-копии сохранённых фото заявки — для альбома в Telegram. */
export async function photoJpegs(photos:LeadPhoto[]):Promise<Buffer[]> {
  return Promise.all(photos.map(async p=>sharp(await readFile(path.join(photoDir(),p.id+".webp"))).jpeg({quality:85}).toBuffer()));
}
export async function readSubmission(request:Request) {
  const reader=request.body?.getReader();const chunks:Uint8Array[]=[];let size=0;
  if(reader)while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>13*1024*1024){await reader.cancel();throw new Error("Слишком большой запрос. До 4 фото по 3 МБ.");}chunks.push(r.value);}
  const data=Buffer.concat(chunks);
  if(request.headers.get("content-type")?.includes("multipart/form-data")){
    const form=await new Response(data,{headers:{"content-type":request.headers.get("content-type")!}}).formData();
    const files=form.getAll("photos");
    if(files.some(f=>typeof f==="string"))throw new Error("Некорректное фото.");
    return {raw:JSON.parse(String(form.get("payload"))),files:files as File[]};
  }
  return {raw:JSON.parse(data.toString("utf8")),files:[] as File[]};
}
