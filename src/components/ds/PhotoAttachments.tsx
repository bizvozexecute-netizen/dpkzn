"use client";
import { useId, useState } from "react";
export default function PhotoAttachments({files,onChange,disabled=false}:{files:File[];onChange:(files:File[])=>void;disabled?:boolean}) {
  const id=useId();
  const [error,setError]=useState("");
  return <div className="min-w-0 space-y-2">
    <label htmlFor={id} className="block text-body-sm text-ink">Прикрепить фото автомобиля</label>
    <p id={id+"-hint"} className="text-caption text-ink-secondary">До 4 фото JPG, PNG или WebP, до 3 МБ каждое. Общий вид и крупные планы деталей.</p>
    <label className="inline-flex cursor-pointer rounded-md border border-line px-4 py-3 text-body-sm text-ink focus-within:outline-2 focus-within:outline-accent">Выбрать фото
    <input id={id} aria-describedby={id+"-hint"} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={disabled}
      className="sr-only"
      onChange={e=>{
        const next=[...files,...Array.from(e.target.files||[])];e.target.value="";
        if(next.length>4){setError("Можно прикрепить не больше 4 фото.");return;}
        if(next.some(f=>!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>3*1024*1024||!f.size)){setError("Выберите JPG, PNG или WebP размером до 3 МБ.");return;}
        setError("");onChange(next);
      }}/></label>
    {error&&<p role="alert" className="text-caption text-error">{error}</p>}
    <ul className="space-y-2">{files.map((file,i)=><li key={i} className="flex min-w-0 items-center gap-2 text-body-sm">
      <span className="min-w-0 flex-1 break-all">{file.name}</span><button type="button" disabled={disabled} className="ds-focus min-h-11 shrink-0 px-2 underline" aria-label={"Удалить фото "+file.name} onClick={()=>{setError("");onChange(files.filter((_,n)=>n!==i));}}>Удалить</button>
    </li>)}</ul>
  </div>;
}
