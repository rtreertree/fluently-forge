import * as Minio from 'minio';

declare global {
    var minioClient: Minio.Client | undefined; //eslint-disable-line
}
console.log('Initializing Minio client');
console.log('MINIO_ENDPOINT:', process.env.MINIO_ENDPOINT);

export const minioClient = globalThis.minioClient || new Minio.Client({
    // endPoint: 'minio',
    endPoint: process.env.MINIO_ENDPOINT || 'minio',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'false',
    accessKey: process.env.MINIO_ROOT_USER || '',
    secretKey: process.env.MINIO_ROOT_PASSWORD || '',
});

export const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'test';

if (process.env.NODE_ENV !== 'production') {
    globalThis.minioClient = minioClient;
}