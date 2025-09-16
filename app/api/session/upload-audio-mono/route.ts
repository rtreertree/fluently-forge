"use server";

import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, uploadSession } from '@/actions/fileHandler';
import { db } from '@/lib/db';
import { startAssessmentPipeline } from '@/actions/assessment';



export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Token:', token);
    // check if the token is valid
    const session = await db.user.findFirst({
        where: {
            id: token,
        },
    });

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Read formdata (stream)
        const formData = await req.formData();

        const userAudio = formData.get('user-audio') as File;

        if (!userAudio) {
            return NextResponse.json({ error: 'Missing audio files' }, { status: 400 });
        }

        // Save the files to the server
        await uploadFile(Buffer.from(await userAudio.arrayBuffer()), `${formData.get('session-id')}/user.wav`);
        
        console.log("Uploaded user audio for session:", formData.get('session-id'));
        startAssessmentPipeline(formData.get('session-id') as string);
        
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}