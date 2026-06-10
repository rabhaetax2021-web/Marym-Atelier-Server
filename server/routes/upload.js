import { Router } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || '';
const MINIO_REGION = process.env.MINIO_REGION || 'us-east-1';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || process.env.marymatelier_MINIO_ACCESS_KEY || '';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || process.env.marymatelier_MINIO_SECRET_KEY || '';
const MINIO_BUCKET = process.env.MINIO_BUCKET || process.env.marymatelier_MINIO_BUCKET || 'public';
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || '';

let s3 = null;
if (MINIO_ENDPOINT && MINIO_ACCESS_KEY && MINIO_SECRET_KEY) {
  s3 = new S3Client({
    endpoint: MINIO_ENDPOINT,
    region: MINIO_REGION,
    credentials: { accessKeyId: MINIO_ACCESS_KEY, secretAccessKey: MINIO_SECRET_KEY },
    forcePathStyle: true,
  });
} else {
  console.warn('MinIO upload route: missing MINIO env vars');
}

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!s3) return res.status(500).json({ ok: false, error: 'Server misconfigured (missing MinIO env vars)' });

    let buffer = null;
    let mimetype = 'application/octet-stream';
    let originalname = `upload-${Date.now()}`;

    if (req.file && req.file.buffer) {
      buffer = req.file.buffer;
      mimetype = req.file.mimetype || mimetype;
      originalname = req.file.originalname || originalname;
    }

    if (!buffer && req.body && typeof req.body.dataUrl === 'string') {
      const dataUrl = req.body.dataUrl;
      const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!matches) return res.status(400).json({ ok: false, error: 'Invalid dataUrl' });
      mimetype = matches[1] || mimetype;
      const b64 = matches[2];
      buffer = Buffer.from(b64, 'base64');
      originalname = (req.body.filename && String(req.body.filename)) || originalname;
    }

    if (!buffer) return res.status(400).json({ ok: false, error: 'No file uploaded' });

    const timestamp = Date.now();
    const safeName = (originalname || 'upload').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const remotePath = `uploads/${timestamp}-${safeName}`;

    const putParams = {
      Bucket: MINIO_BUCKET,
      Key: remotePath,
      Body: buffer,
      ContentType: mimetype,
    };

    try {
      await s3.send(new PutObjectCommand(putParams));
    } catch (err) {
      console.error('MinIO upload error:', err);
      return res.status(500).json({ ok: false, error: String(err) });
    }

    const publicUrl = MINIO_PUBLIC_URL
      ? `${MINIO_PUBLIC_URL.replace(/\/$/, '')}/${MINIO_BUCKET}/${remotePath}`
      : null;

    return res.status(200).json({ ok: true, url: publicUrl });
  } catch (err) {
    console.error('POST /api/upload-image error:', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
