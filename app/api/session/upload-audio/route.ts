import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { uploadSession } from '@/actions/fileHandler';


const saveAudio = async (file: File, filename: string) => {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'tmp');
    mkdir(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);
};


export async function POST(req: NextRequest) {
    try {
        // Read formdata (stream)
        const formData = await req.formData();

        const userAudio = formData.get('user-audio') as File;
        const agentAudio = formData.get('agent-audio') as File;
        const mixedAudio = formData.get('mixed-audio') as File;

        if (!userAudio || !agentAudio || !mixedAudio) {
            return NextResponse.json({ error: 'Missing audio files' }, { status: 400 });
        }

        // Save the files to the server
        await uploadSession({
            userId: formData.get('user-id') as string,
            sessionId: formData.get('session-id') as string,
            agentAudio: Buffer.from(await agentAudio.arrayBuffer()),
            userAudio: Buffer.from(await userAudio.arrayBuffer()),
            mergedAudio: Buffer.from(await mixedAudio.arrayBuffer()),
        })

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}