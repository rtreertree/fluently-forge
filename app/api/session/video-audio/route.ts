import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/actions/fileHandler';
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 });
        }
        const providedToken = authHeader.replace('Bearer ', '');

        const formData = await req.formData();
        const userAudio = formData.get('user-audio') as File;
        const sessionId = formData.get('session-id') as string;

        if (!userAudio || !sessionId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const session = await db.video_session.findUnique({
            where: { id: sessionId },
            select: { tokenuser1: true, tokenuser2: true, userId1: true, userId2: true }
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        let userId = '';
        if (providedToken === session.tokenuser1) {
            userId = session.userId1;
        } else if (providedToken === session.tokenuser2) {
            userId = session.userId2;
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await uploadFile(Buffer.from(await userAudio.arrayBuffer()), `${sessionId}/${userId}.wav`);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}