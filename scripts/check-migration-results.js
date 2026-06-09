import { Client } from 'pg';
(async ()=>{
  try{
    let conn = process.env.marymatelier_POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
    if(!conn) {
      // attempt to read .env.production
      try{
        const envText = await import('fs').then(fs=>fs.readFileSync('.\\.env.production','utf8'));
        for (const line of envText.split(/\r?\n/)){
          if (!line || line.trim().startsWith('#')) continue;
          const [k,v] = line.split('=',2);
          if (k && v){
            const key=k.trim(); const val=v.trim().replace(/^"|"$/g,'');
            if (key === 'marymatelier_POSTGRES_URL_NON_POOLING' && !conn) conn = val;
            if (key === 'marymatelier_POSTGRES_URL' && !conn) conn = val;
          }
        }
      }catch(e){ /* ignore */ }
    }
    if(!conn){ console.error('No POSTGRES_URL'); process.exit(1); }
    const pg = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
    await pg.connect();
    const r1 = await pg.query(`SELECT COUNT(*) FROM public.dresses WHERE images::text LIKE '%data:%'`);
    console.log('rows_with_data_urls:', r1.rows[0].count);
    const r2 = await pg.query(`SELECT COUNT(*) FROM image_migrations`);
    console.log('image_migrations_count:', r2.rows[0].count);
    const r3 = await pg.query(`SELECT COUNT(*) FROM public.dresses WHERE images IS NULL OR images = '[]'::jsonb`);
    console.log('rows_images_null_or_empty:', r3.rows[0].count);
    await pg.end();
  }catch(e){ console.error(e); process.exit(1); }
})();