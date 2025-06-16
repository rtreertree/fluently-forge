"use server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';



export const isVideoSessionActive = async (
  userId: string,
  topic: string,
  list_date: string[] 
) => {
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

    const videoSession = await db.video_session.findFirst({
      where: {
        OR: [
          { userId1: "" },
          { userId2: "" }
        ],
        topic: formattedTopic,
        status: "PENDING"
      },
    });
    if (videoSession) {
      await db.video_session.update({
        where: { id: videoSession.id },
        data: {
          userId2: userId,
          status: "ACTIVE"
        },
      });
      return "joined-session";
  }

  if (!videoSession) {
await db.video_session.create({
  data: {
    id: uuid(),
    userId1: userId,
    userId2: "",
    topic: formattedTopic,
    listdate: list_date,
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
  // Set now to UTC+7
  const now = new Date();
  now.setHours(now.getHours() + 7);
  now.setUTCHours(0, 0, 0, 0); 
  // Find the user's active session
  const videoSession = await db.video_session.findFirst({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId }
      ],
      status: "ACTIVE"
    },
  });

  if (!videoSession) {
    return null;
  }
  console.log("Found video session:", videoSession);
  // Only generate token if startedAt is set and now >= startedAt
  if (!videoSession.startedAt || now < videoSession.startedAt) {
    // Not time yet
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
    data: { token: token },
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

export const getPendingSessionByTopic = async (
  userId: string,
  topic: string
) => {
  const formattedTopic = topic.toUpperCase().replace(/\s+/g, "");

  // Check if user is already in an active session
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
    return { status: "already-in-session" };
  }

  // Check for a pending session for this topic
  const videoSession = await db.video_session.findFirst({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId }
      ],
      topic: formattedTopic,
      status: "PENDING"
    },
  });
  if (videoSession) {
    return { status: "pending-session", session: videoSession };
  }

  return { status: "no-session" };
};

// Get the first user's listdate for a session
export const getSessionListDates = async (sessionId: string) => {
  const session = await db.video_session.findUnique({
    where: { id: sessionId },
    select: { listdate: true },
  });
  console.log("Session listdate:", session?.listdate);
  return session?.listdate || [];
};

// Set startedAt in the session when user2 joins
export const joinSessionWithStartAt = async (
  sessionId: string,
  userId: string,
  startedAt: Date, 
) => {

  return db.video_session.update({
    where: { id: sessionId },
    data: {
      userId2: userId,
      status: "ACTIVE",
      startedAt: startedAt,
    },
  });
};


