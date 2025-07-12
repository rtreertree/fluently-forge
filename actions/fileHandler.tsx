"use server";

import { minioClient, BUCKET_NAME } from "@/lib/files";
import { ReadStream } from "fs";
import { PassThrough, Readable } from "stream";
import FormData from 'form-data';
import fs from 'fs';





export interface SessionUploadInterface {
    userId: string;
    sessionId: string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agentAudio: Buffer<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userAudio: Buffer<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mergedAudio: Buffer<any>;

};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function uploadFile(fileBuffer: Buffer<any>, fileName: string) {
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



export async function getRecordings(sessionId: string, role: "agent" | "user"): Promise<Readable | null> {
    try {
        let size = 0
        const dataStream = await minioClient.getObject(BUCKET_NAME, `${sessionId}/${role}.wav`)
        dataStream.on('data', function (chunk) {
            size += chunk.length
        })
        dataStream.on('error', function (err) {
            console.log(err)
        })

        return dataStream;;
    } catch (error) {
        return null;
    }
}