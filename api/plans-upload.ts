import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

// Node runtime here only honors a returned Response from a NAMED HTTP-method export (e.g. POST) —
// a default export with this signature silently discards the response and hangs until maxDuration.
export const config = { runtime: 'nodejs', regions: ['syd1'], maxDuration: 30 };

// Generates a short-lived client upload token so the tradie's browser can send a plans PDF
// straight to Vercel Blob storage, bypassing Vercel Functions' 4.5MB request body cap entirely —
// see api/quote.ts, which reads the resulting URL server-side instead of a base64 body field.
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['application/pdf'],
        addRandomSuffix: true,
        maximumSizeInBytes: 25 * 1024 * 1024,
      }),
      onUploadCompleted: async () => { /* nothing to persist — api/quote.ts deletes the blob once it's read the file */ },
    });
    return Response.json(jsonResponse);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 400 });
  }
}
