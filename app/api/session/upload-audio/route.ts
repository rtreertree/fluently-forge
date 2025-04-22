import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        // Read formdata (stream)
        const formData = await req.formData();
        const file = formData.get('audio') as File;

        const fileid = formData.get('filename') as string;

        if (!file) {
            return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
        }

        // Get array buffer then Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Make a unique filename
        const filename = `${fileid}.webm`;

        // Save to /tmp or a subdirectory of your choosing
        const uploadDir = path.join(process.cwd(), 'tmp');
        // Node's fs/promises does NOT automatically create dir, so you might want to ensure it exists
        await import('fs/promises').then(fs => fs.mkdir(uploadDir, { recursive: true }));

        const filepath = path.join(uploadDir, filename);

        // Write file
        await writeFile(filepath, buffer);

        return NextResponse.json({ success: true, filename });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}