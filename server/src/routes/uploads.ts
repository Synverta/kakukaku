import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import type { RequestHandler } from 'express'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { requireAuth } from '../lib/auth'

export const uploadsRouter = Router()

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads')
const VIDEO_DIR = path.join(UPLOAD_ROOT, 'videos')
const COVER_DIR = path.join(UPLOAD_ROOT, 'covers')

for (const dir of [VIDEO_DIR, COVER_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function safeRandomId(originalExt: string): string {
  const ts = Date.now().toString(36)
  const rand = crypto.randomBytes(8).toString('hex')
  return `${ts}-${rand}${originalExt ? `.${originalExt}` : ''}`
}

function getExt(originalName: string, mimetype: string): string {
  if (originalName && originalName.includes('.')) {
    const ext = originalName.split('.').pop()!.toLowerCase()
    if (/^[a-z0-9]{1,8}$/.test(ext)) return ext
  }
  if (mimetype.startsWith('video/')) {
    const m = mimetype.split('/')[1]
    return m === 'quicktime' ? 'mov' : m
  }
  if (mimetype.startsWith('image/')) return mimetype.split('/')[1].replace('jpeg', 'jpg')
  return 'bin'
}

const VIDEO_MIME = /^video\/(mp4|quicktime|x-matroska|webm|x-msvideo|x-flv|x-m4v|3gpp|mp2t|mpeg)$/
const IMAGE_MIME = /^image\/(png|jpe?g|webp|gif|avif)$/

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEO_DIR),
  filename: (_req, file, cb) => {
    const ext = getExt(file.originalname, file.mimetype)
    cb(null, safeRandomId(ext))
  },
})

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, COVER_DIR),
  filename: (_req, file, cb) => {
    const ext = getExt(file.originalname, file.mimetype)
    cb(null, safeRandomId(ext))
  },
})

const MAX_VIDEO_BYTES = Number(process.env.MAX_VIDEO_BYTES ?? 2 * 1024 * 1024 * 1024) // 2GB
const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES ?? 8 * 1024 * 1024) // 8MB

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!VIDEO_MIME.test(file.mimetype)) {
      cb(new Error(`unsupported_video_type: ${file.mimetype}`))
      return
    }
    cb(null, true)
  },
}).single('file')

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIME.test(file.mimetype)) {
      cb(new Error(`unsupported_image_type: ${file.mimetype}`))
      return
    }
    cb(null, true)
  },
}).single('file')

function publicBaseUrl(req: { protocol: string; headers: Record<string, string | string[] | undefined>; get: (k: string) => string | undefined }): string {
  const envBase = (process.env.PUBLIC_BASE_URL ?? '').trim().replace(/\/$/, '')
  if (envBase) return envBase
  const forwardedProto = (req.headers['x-forwarded-proto'] ?? '').toString().split(',')[0]?.trim()
  const forwardedHost = (req.headers['x-forwarded-host'] ?? '').toString().split(',')[0]?.trim()
  const host = forwardedHost ?? req.get('host')
  const proto = forwardedProto ?? req.protocol
  return `${proto}://${host}`
}

function runUpload(middleware: RequestHandler, req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    middleware(req, res, (err: unknown) => {
      if (err) reject(err instanceof Error ? err : new Error(String(err)))
      else resolve()
    })
  })
}

uploadsRouter.post('/uploads/video', requireAuth, async (req, res) => {
  try {
    await runUpload(videoUpload, req, res)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'upload_failed'
    const status = /LIMIT_FILE_SIZE/.test(message) ? 413 : 400
    res.status(status).json({ error: 'upload_rejected', message })
    return
  }
  if (!req.file) {
    res.status(400).json({ error: 'missing_file' })
    return
  }
  const base = publicBaseUrl(req)
  const relPath = `/uploads/videos/${req.file.filename}`
  res.status(201).json({
    url: `${base}${relPath}`,
    relPath,
    objectKey: req.file.filename,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    maxSizeBytes: MAX_VIDEO_BYTES,
  })
})

uploadsRouter.post('/uploads/cover', requireAuth, async (req, res) => {
  try {
    await runUpload(imageUpload, req, res)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'upload_failed'
    const status = /LIMIT_FILE_SIZE/.test(message) ? 413 : 400
    res.status(status).json({ error: 'upload_rejected', message })
    return
  }
  if (!req.file) {
    res.status(400).json({ error: 'missing_file' })
    return
  }
  const base = publicBaseUrl(req)
  const relPath = `/uploads/covers/${req.file.filename}`
  res.status(201).json({
    url: `${base}${relPath}`,
    relPath,
    objectKey: req.file.filename,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    maxSizeBytes: MAX_IMAGE_BYTES,
  })
})

uploadsRouter.get('/uploads/config', requireAuth, (_req, res) => {
  res.json({
    video: { maxSizeBytes: MAX_VIDEO_BYTES, acceptedMime: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'] },
    cover: { maxSizeBytes: MAX_IMAGE_BYTES, acceptedMime: ['image/png', 'image/jpeg', 'image/webp'] },
  })
})
