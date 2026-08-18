/**
 * Client-side file upload via presigned S3 URLs.
 *
 * Flow:
 * 1. Show the image immediately using a local blob URL (instant feedback)
 * 2. POST to /api/upload to get a presigned PUT URL + the final public URL
 * 3. PUT the file directly to S3 from the browser (bypasses server timeout)
 * 4. Replace the blob URL with the permanent S3 public URL
 *
 * Toast notifications show progress/success/failure via sonner.
 */
import { toast } from 'sonner'
import type { Editor } from '@tiptap/core'

interface UploadResult {
  publicUrl: string
  key: string
}

/**
 * Upload a file to S3 via presigned URL.
 * Returns the public URL on success, null on failure.
 */
export async function uploadFileToS3(file: File): Promise<UploadResult | null> {
  // Step 1: Get presigned URL from our server
  const presignRes = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  })

  const presignData = await presignRes.json()

  if (!presignRes.ok || !presignData.uploadUrl) {
    throw new Error(presignData.error || 'Failed to get upload URL')
  }

  // Step 2: Upload directly to S3 from the browser
  const uploadRes = await fetch(presignData.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  })

  if (!uploadRes.ok) {
    throw new Error(`S3 upload failed: ${uploadRes.status} ${uploadRes.statusText}`)
  }

  return {
    publicUrl: presignData.publicUrl,
    key: presignData.key,
  }
}

/**
 * Insert an image into the editor at `pos`, showing a local preview immediately.
 * Once the S3 upload completes, the blob URL is replaced with the permanent URL.
 */
export function uploadAndInsertImage(
  file: File,
  editor: Editor,
  pos?: number
) {
  // Instant preview: create a blob URL and insert the image immediately
  const blobUrl = URL.createObjectURL(file)
  const insertPos = pos ?? editor.state.selection.from

  editor
    .chain()
    .focus()
    .insertContentAt(insertPos, {
      type: 'image',
      attrs: { src: blobUrl, alt: file.name },
    })
    .run()

  // Start the upload with a toast
  const toastId = toast.loading(`Uploading ${file.name}...`)

  uploadFileToS3(file)
    .then((result) => {
      if (!result) {
        toast.error('Upload failed', { id: toastId })
        return
      }

      // Replace the blob URL with the permanent S3 URL in the document
      const { doc, tr } = editor.state
      let replaced = false

      doc.descendants((node, nodePos) => {
        if (
          !replaced &&
          node.type.name === 'image' &&
          node.attrs.src === blobUrl
        ) {
          tr.setNodeMarkup(nodePos, undefined, {
            ...node.attrs,
            src: result.publicUrl,
          })
          replaced = true
          return false // stop traversal
        }
        return true
      })

      if (replaced) {
        editor.view.dispatch(tr)
      }

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl)

      toast.success('Image uploaded', { id: toastId })
    })
    .catch((error) => {
      toast.error(
        error instanceof Error ? error.message : 'Upload failed',
        { id: toastId }
      )
      // Keep the blob URL as fallback so the user can still see the image locally
    })
}

/**
 * Upload from the slash menu's Image command.
 * Opens a file picker and handles the full flow.
 */
export function triggerImageUpload(editor: Editor) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    uploadAndInsertImage(file, editor)
  }
  input.click()
}
