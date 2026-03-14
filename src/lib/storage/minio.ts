import { Client } from 'minio';

const rawEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
const minioAccessKey = process.env.MINIO_ACCESS_KEY || '';
const minioSecretKey = process.env.MINIO_SECRET_KEY || '';

// MinIO client expects hostname only (no protocol). Support full URL or hostname.
let minioHost: string;
let minioPort: number;
let minioUseSSL: boolean;

if (rawEndpoint.startsWith('http://') || rawEndpoint.startsWith('https://')) {
  const url = new URL(rawEndpoint);
  minioHost = url.hostname;
  minioPort = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
  minioUseSSL = url.protocol === 'https:';
} else {
  minioHost = rawEndpoint;
  minioPort = parseInt(process.env.MINIO_PORT || '9000', 10);
  minioUseSSL = process.env.MINIO_USE_SSL === 'true';
}

// Initialize the MinIO client
export const minioClient = new Client({
  endPoint: minioHost,
  port: minioPort,
  useSSL: minioUseSSL,
  accessKey: minioAccessKey,
  secretKey: minioSecretKey,
});

/**
 * Formats a bucket name for a specific team (bucket = team id only).
 * MinIO bucket names must be lowercase alphanumeric and hyphens.
 */
export function getTeamBucketName(teamId: string): string {
  return teamId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

/**
 * Ensures a specific team's MinIO bucket exists.
 * Should be called when initializing storage for a team or before uploading.
 */
export async function ensureTeamBucket(teamId: string): Promise<string> {
  const bucketName = getTeamBucketName(teamId);
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'eu-west-1');
      console.log(`MinIO bucket '${bucketName}' created successfully.`);
    }
  } catch (error) {
    console.error(`Error checking/creating MinIO bucket '${bucketName}':`, error);
    // Don't throw to not crash startup, but log it
  }
  return bucketName;
}
