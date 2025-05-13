import * as Minio from 'minio';

declare global {
    var minioClient: Minio.Client | undefined; //eslint-disable-line
}

export const minioClient = globalThis.minioClient || new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
});

export const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'test';

if (process.env.NODE_ENV !== 'production') {
    globalThis.minioClient = minioClient;
}