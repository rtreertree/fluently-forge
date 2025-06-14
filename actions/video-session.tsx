"use server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';



export const isVideoSessionActive = async (userId: string, topic: string) => {
  const formattedTopic = topic.toUpperCase().replace(/\s+/g, "");


  const userSession = await db.video_session.findFirst({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId }
      ],
      status: "ACTIVE"
    },
  });

  if (userSession) {
    return "already-in-session";
  }

  const topicSession = await db.video_session.findFirst({
    where: { topic: formattedTopic },
  });


  if (topicSession) {
    const videoSession = await db.video_session.findFirst({
      where: { topic: formattedTopic },
    });
    if (videoSession) {
      await db.video_session.update({
        where: { id: videoSession.id },
        data: { userId2: userId,
                status: "ACTIVE"  
         }, // Set status to ACTIVE when joined
      });
      return "joined-session";
    }
  }

  if (!topicSession) {
    await db.video_session.create({
      data: {
        id: uuid(),
        userId1: userId,
        userId2: "",
        topic: formattedTopic,
      },
    });
    return "created-session";
  }

  return "unknown-error";
};

export const getAllVideoSessions = async () => {
  return db.video_session.findMany();
};

export const getUserVideoSession = async (userId: string) => {
  return db.video_session.findFirst({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId }
      ],
      status: "ACTIVE", 
    },
  });
};

export const endVideoSession = async (sessionId: string) => {
  return db.video_session.update({
    where: { id: sessionId },
    data: { status: "COMPLETED" },
  });
};

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const APP_CERTIFICATE = process.env.NEXT_PUBLIC_AGORA_APP_CERTIFICATE!;

export const generateAndStoreToken = async (
  userId: string
) => {
  // Get current time rounded to the second
  console.log("Generating token for user:", userId);
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  // Await the session fetch!
  const videoSession = await db.video_session.findFirst({
    where: {
      startedAt: now,
      OR: [
        { userId1: userId },
        { userId2: userId } 
      ],
    },
  });
  console.log("Video session found:", videoSession,now);
  if (!videoSession) {
    return null;
  }

  const channelName = videoSession.topic ?? 'video_session_topic';

  const expireTime = Math.floor(Date.now() / 1000) + 86400;
  const Token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    Number(0),
    RtcRole.PUBLISHER,
    expireTime
  );

  // Await the update!
  await db.video_session.update({
    where: { id: videoSession.id },
    data: { token: Token },
  });

  console.log("Token generated and stored:", Token);
  return Token;
};

export const getVideoSessionTopicAndToken = async (): Promise<{ topic: string; token: string } | null> => {
  const session = await db.video_session.findFirst({
    select: { topic: true, token: true },
  });
  if (!session || !session.topic || !session.token) return null;
  return { topic: session.topic, token: session.token };
};

export const generateAndStoreTokenBySessionId = async (sessionId: string) => {
  const videoSession = await db.video_session.findUnique({
    where: { id: sessionId },
  });
  if (!videoSession) return null;

  const channelName = videoSession.topic;
  const expireTime = Math.floor(Date.now() / 1000) + 86400;
  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    0,
    RtcRole.PUBLISHER,
    expireTime
  );

  await db.video_session.update({
    where: { id: sessionId },
    data: { token :token},
  });

  return token;
};


export const getUserNamesBySessionId = async (sessionId: string) => {
  const session = await db.video_session.findUnique({
    where: { id: sessionId },
    select: { userId1: true, userId2: true },
  });
  if (!session) return { user1: null, user2: null };

  const [user1, user2] = await Promise.all([
    session.userId1
      ? db.user.findUnique({ where: { id: session.userId1 }, select: { name: true } })
      : null,
    session.userId2
      ? db.user.findUnique({ where: { id: session.userId2 }, select: { name: true } })
      : null,
  ]);

  return {
    user1: user1?.name || null,
    user2: user2?.name || null,
  };
};

export const getSessionUserNamesBySessionId = async (sessionId: string) => {
  const session = await db.video_session.findUnique({
    where: { id: sessionId },
    select: { userId1: true, userId2: true },
  });
  if (!session) return [];

  const userIds = [session.userId1, session.userId2].filter(Boolean) as string[];

  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true }
  });

  // Ensure the names are in the same order as userIds
  const names = userIds.map(
    id => users.find(u => u.id === id)?.name || "Unknown"
  );

  return names;
};

