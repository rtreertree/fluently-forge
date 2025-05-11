import { NextRequest, NextResponse } from 'next/server';
import { uploadSession } from '@/actions/fileHandler';
import { db } from '@/lib/db';



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