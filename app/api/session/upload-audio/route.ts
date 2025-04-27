import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';


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
        console.log('Received request');
        const formData = await req.formData();

        const userAudio = formData.get('mixed-audio') as File;
        const agentAudio = formData.get('mixed-audio') as File;

        const fileid = formData.get('user') as string;

        if (!userAudio && !agentAudio) {
            return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
        }

        saveAudio(userAudio, `user${fileid}.webm`);
        saveAudio(agentAudio, `agent${fileid}.webm`);


        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}