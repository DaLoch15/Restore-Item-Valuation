import { Storage } from '@google-cloud/storage';
import { config } from './config';

// Initialize GCS client
const storage = new Storage({
  projectId: config.GCS_PROJECT_ID,
  keyFilename: config.GCS_KEY_FILE,
});

const bucket = storage.bucket(config.GCS_BUCKET_NAME);

// Generate a signed URL for reading (1 hour expiry)
export async function getSignedUrl(storagePath: string): Promise<string> {
  const file = bucket.file(storagePath);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  return url;
}

// Upload a file buffer to GCS
export async function uploadFile(
  storagePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: {
      cacheControl: 'public, max-age=31536000', // 1 year cache
    },
  });

  // Return the GCS URI
  return `gs://${config.GCS_BUCKET_NAME}/${storagePath}`;
}

// Delete a file from GCS
export async function deleteFile(storagePath: string): Promise<void> {
  const file = bucket.file(storagePath);

  try {
    await file.delete();
  } catch (error: unknown) {
    // Ignore 404 errors (file already deleted)
    if ((error as { code?: number }).code !== 404) {
      throw error;
    }
  }
}

// Delete multiple files from GCS
export async function deleteFiles(storagePaths: string[]): Promise<void> {
  await Promise.all(storagePaths.map((path) => deleteFile(path)));
}

// Check if a file exists
export async function fileExists(storagePath: string): Promise<boolean> {
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  return exists;
}

export { bucket, storage };
