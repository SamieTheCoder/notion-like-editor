import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'

export const runtime = 'nodejs'

const REGION = process.env.STORAGE_REGION || 'us-east-1'
const BUCKET = process.env.STORAGE_BUCKET || 'ischat'

const s3 = new S3Client({
  region: REGION,
  ...(process.env.STORAGE_ENDPOINT
    ? { endpoint: process.env.STORAGE_ENDPOINT, forcePathStyle: true }
    : {}),
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY || '',
    secretAccessKey: process.env.STORAGE_SECRET_KEY || '',
  },
})

/** Allowed MIME types for upload. */
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
])

const MAX_SIZE = 50 * 1024 * 1024 // 50 MB

/**
 * POST /api/upload
 *
 * Accepts JSON: { filename: string, contentType: string, size: number }
 * Returns a presigned PUT URL that the browser uses to upload directly to S3.
 *
 * Response: { uploadUrl: string, publicUrl: string, key: string }
 *
 * The browser then does: fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } })
 * After the PUT succeeds, publicUrl is the permanent link to display the image.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      filename?: string
      contentType?: string
      size?: number
    }

    const { filename, contentType, size } = body

    if (!filename || !contentType) {
      return Response.json(
        { error: 'Required fields: filename, contentType' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.has(contentType)) {
      return Response.json(
        { error: `File type "${contentType}" is not allowed.` },
        { status: 400 }
      )
    }

    if (size && size > MAX_SIZE) {
      return Response.json(
        { error: `File too large. Maximum is ${MAX_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      )
    }

    // Generate unique key
    const ext = filename.split('.').pop()?.toLowerCase() || 'bin'
    const key = `editor/${randomUUID()}.${ext}`

    // Generate presigned PUT URL (valid for 5 minutes)
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })

    // Public URL for after upload completes
    let publicUrl: string
    if (process.env.STORAGE_ENDPOINT) {
      publicUrl = `${process.env.STORAGE_ENDPOINT}/${BUCKET}/${key}`
    } else {
      publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
    }

    return Response.json({ uploadUrl, publicUrl, key })
  } catch (error) {
    console.error('Presign error:', error)
    return Response.json(
      {
        error: 'Failed to generate upload URL',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
