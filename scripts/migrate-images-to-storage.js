#!/usr/bin/env node
/*
  Migration script: scans `dresses` table for Base64 data URLs in `images` array,
  uploads them to Supabase Storage (bucket: `dresses`), replaces entries with public URLs,
  and logs actions. Safe options: DRY_RUN=1 to only log without making changes.

  Usage:
    DRY_RUN=1 node scripts/migrate-images-to-storage.js
    node scripts/migrate-images-to-storage.js

  Environment variables required:
    marymatelier_SUPABASE_URL
    marymatelier_SUPABASE_SERVICE_ROLE_KEY
    (same variables used by the server)
*/

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.marymatelier_SUPABASE_URL;
const SUPABASE_KEY = process.env.marymatelier_SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars: marymatelier_SUPABASE_URL and marymatelier_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const LOG_DIR = path.resolve(process.cwd(), 'scripts', 'migrate-logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_FILE = path.join(LOG_DIR, `migrate-${Date.now()}.log`);
const DRY_RUN = !!process.env.DRY_RUN;

const writeLog = (line) => fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${line}\n`);

async function run() {
  writeLog('Starting migration. DRY_RUN=' + (DRY_RUN ? '1' : '0'));

  // fetch all dresses with images
  const { data: dresses, error } = await supabase.from('dresses').select('id,images');
  if (error) {
    console.error('Failed fetching dresses:', error);
    writeLog('Failed fetching dresses: ' + JSON.stringify(error));
    process.exit(1);
  }

  writeLog(`Found ${dresses.length} dresses`);

  for (const dress of dresses) {
    const { id, images } = dress;
    if (!Array.isArray(images) || images.length === 0) continue;
    const needsMigration = images.some((img) => typeof img === 'string' && img.startsWith('data:'));
    if (!needsMigration) continue;

    writeLog(`Processing dress ${id} — ${images.length} images`);
    const newImages = [...images];
    for (let i = 0; i < images.length; i += 1) {
      const img = images[i];
      if (typeof img === 'string' && img.startsWith('data:')) {
        try {
          const matches = img.match(/^data:(.+);base64,(.+)$/);
          if (!matches) {
            writeLog(`Skipping invalid data URL for ${id} index ${i}`);
            continue;
          }
          const mime = matches[1];
          const b64 = matches[2];
          const ext = mime.split('/')[1] || 'jpg';
          const buffer = Buffer.from(b64, 'base64');
          const timestamp = Date.now();
          const remotePath = `migrated/${id}/${timestamp}-${i}.${ext}`;

          writeLog(`Uploading ${id} index ${i} -> ${remotePath}`);
          if (!DRY_RUN) {
            const { error: uploadErr } = await supabase.storage.from('dresses').upload(remotePath, buffer, { contentType: mime, upsert: false });
            if (uploadErr) {
              writeLog(`Upload failed for ${id} index ${i}: ${JSON.stringify(uploadErr)}`);
              continue;
            }
            const { data } = supabase.storage.from('dresses').getPublicUrl(remotePath);
            const publicUrl = data?.publicUrl;
            if (!publicUrl) {
              writeLog(`Failed to get public URL for ${remotePath}`);
              continue;
            }
            newImages[i] = publicUrl;
            writeLog(`Uploaded and replaced image for ${id} index ${i} -> ${publicUrl}`);
          } else {
            writeLog(`DRY_RUN would upload ${id} index ${i} to ${remotePath}`);
            // leave placeholder
            newImages[i] = `DRY_RUN_REPLACED:${remotePath}`;
          }
        } catch (err) {
          writeLog(`Error processing ${id} index ${i}: ${String(err)}`);
        }
      }
    }

    // update record
    if (!DRY_RUN) {
      const { error: updateErr } = await supabase.from('dresses').update({ images: newImages }).eq('id', id);
      if (updateErr) {
        writeLog(`Failed updating images for ${id}: ${JSON.stringify(updateErr)}`);
      } else {
        writeLog(`Updated dress ${id} images successfully`);
      }
    } else {
      writeLog(`DRY_RUN would update dress ${id} images: ${JSON.stringify(newImages)}`);
    }
  }

  writeLog('Migration completed');
  console.log('Migration finished. Log:', LOG_FILE);
}

run().catch((err) => {
  writeLog('Fatal error: ' + String(err));
  console.error(err);
  process.exit(1);
});
