#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.marymatelier_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.marymatelier_SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.BUCKET || 'dresses';

if(!SUPABASE_URL || !SUPABASE_KEY){
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function loadEnvFallback(){
  try{
    const txt = fs.readFileSync(path.resolve(process.cwd(), '.env.production'),'utf8');
    const lines = txt.split(/\r?\n/);
    for(const l of lines){
      if(!l || l.startsWith('#')) continue;
      const [k,v] = l.split('=',2);
      if(k && v){
        const key=k.trim(); const val=v.trim().replace(/^"|"$/g,'');
        if(!process.env[key]) process.env[key]=val;
      }
    }
  }catch(err){ void err; }
}

async function main(){
  await loadEnvFallback();
  const DATABASE_URL = process.env.marymatelier_POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if(!DATABASE_URL){ console.error('Missing DATABASE_URL/POSTGRES_URL'); process.exit(1); }

  const pg = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  // find dresses rows containing data: in images text
  const res = await pg.query("SELECT id, images::text as images_text FROM public.dresses WHERE images::text LIKE '%data:%'");
  console.log('found rows:', res.rows.length);

  for(const row of res.rows){
    const id = row.id;
    const text = row.images_text || '';
    // extract all data URLs
    const re = /data:([\w/+.-]+);base64,([A-Za-z0-9+/=\n\r]+)/g;
    let m; const urls = [];
    while((m=re.exec(text))!==null){
      try{
        const mime = m[1]; const b64 = m[2].replace(/\s+/g,'');
        const ext = (mime.split('/')[1]||'jpg').split('+')[0];
        const buffer = Buffer.from(b64, 'base64');
        const remotePath = `dresses/${id}-${Date.now()}-${Math.floor(Math.random()*10000)}.${ext}`;
        console.log(`Uploading ${id} -> ${remotePath}`);
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(remotePath, buffer, { contentType: mime, upsert: false });
        if(upErr){
          console.error('upload error', upErr);
          continue;
        }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(remotePath);
        urls.push(data?.publicUrl || `https://${SUPABASE_URL}/storage/v1/object/public/${remotePath}`);
      }catch(e){ console.error('upload exception', e); }
    }

    if(urls.length>0){
      // set images column to jsonb array of urls
      try{
        await pg.query('INSERT INTO image_migrations (table_name,column_name,pk_values,uploaded,status) VALUES ($1,$2,$3,$4,$5)', ['dresses','images',JSON.stringify({id}), JSON.stringify(urls.map(u=>({url:u}))), 'done']);
        await pg.query('UPDATE public.dresses SET images = $1, updated_at = now() WHERE id = $2', [JSON.stringify(urls), id]);
        console.log(`Updated ${id} -> ${urls.length} urls`);
      }catch(e){ console.error('db update error', e); }
    } else {
      console.log(`No data URLs found for ${id} (unexpected)`);
      await pg.query('INSERT INTO image_migrations (table_name,column_name,pk_values,uploaded,status) VALUES ($1,$2,$3,$4,$5)', ['dresses','images',JSON.stringify({id}), JSON.stringify([]), 'skipped']);
    }
  }

  await pg.end();
  console.log('done');
}

main().catch(e=>{ console.error(e); process.exit(1); });
