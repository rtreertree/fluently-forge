"use server";

import { minioClient, BUCKET_NAME} from "@/lib/files";

export interface SessionUploadInterface {
    userId: string;
    sessionId: string;

    agentAudio: Buffer<any>;
    userAudio: Buffer<any>;
    mergedAudio: Buffer<any>;
};


export async function uploadFile (fileBuffer: Buffer<any>, fileName: string) {
    if (!minioClient) throw new Error("Minio client is not initialized");
    if (!(await minioClient.bucketExists(BUCKET_NAME))) await minioClient.makeBucket(BUCKET_NAME, "us-east-1");

    await minioClient.putObject(
        BUCKET_NAME,
        fileName,
        fileBuffer,
        fileBuffer.length,
        {
            'Content-Type': 'audio/wav',
            'x-amz-acl': 'public-read'
        }
    )
}


export async function uploadSession(sessionUpload: SessionUploadInterface) {
    if (!(await minioClient.bucketExists(BUCKET_NAME))) {
        await minioClient.makeBucket(BUCKET_NAME, "us-east-1");
    }

    // Upload the files promised all
    const uploadPromises = [
        uploadFile(sessionUpload.agentAudio, `${sessionUpload.sessionId}/agent.wav`),
        uploadFile(sessionUpload.userAudio, `${sessionUpload.sessionId}/user.wav`),
        uploadFile(sessionUpload.mergedAudio, `${sessionUpload.sessionId}/merged.wav`),
    ];

    await Promise.all(uploadPromises);
};