"use server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

export const cancelOldPendingSessions = async () => {
  const sessions = await db.video_session.findMany({
    where: {
      OR: [
        { userId1: "" },
        { userId2: "" }
      ],
      status: "PENDING",
    },
    select: { id: true, createdAt: true },
  });
  const now = new Date();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const expiredSessions = sessions.filter(s => {
    if (!s.createdAt) return false;
    return (now.getTime() - new Date(s.createdAt).getTime()) >= threeDaysMs;
  });
  if (expiredSessions.length === 0) return 0;
  const updatePromises = expiredSessions.map(s =>
    db.video_session.update({
      where: { id: s.id },
      data: { status: "CANCELLED" },
    })
  );
  await Promise.all(updatePromises);
}

// export const cancelExceedingAppointmentSession = async () => {
//   const sessions = await db.video_session.findMany({
//     where: {
//       status: "ACTIVE",
//     },
//     select: { id: true, startedAt: true },
//   });
//   const now = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
//   const thirtyMinutesMs = 30 * 60 * 1000;
//   const expiredSessions = sessions.filter(s => {
//     if (!s.startedAt) return false;
//     return (now.getTime() - new Date(s.startedAt).getTime()) >= thirtyMinutesMs;
//   });
//   console.log(now);
//   console.log("All active sessions:", sessions);
//   console.log("Expired sessions exceeding 30 minutes:", expiredSessions.length);
//   if (expiredSessions.length === 0) return 0;
//   const updatePromises = expiredSessions.map(s =>
//     db.video_session.update({
//       where: { id: s.id },
//       data: { status: "CANCELLED" },
//     })
//   );
//   await Promise.all(updatePromises);

//   sessions.forEach(s => {
//     if (!s.startedAt) return;
//     const diff = now.getTime() - new Date(s.startedAt).getTime();
//   });
// }

export const isVideoSessionActive = async (
  userId: string,
  topic: string,
  list_date: string[]
) => {
  const formattedTopic = topic.toUpperCase().replace(/\s+/g, "");


  const userSession = await db.video_session.findMany({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId }
      ],
      status: "ACTIVE"
    },
  });

  if (userSession.length >= 3) {
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
        userId2: "", // Use a placeholder string
        topic: formattedTopic,
        listdate: list_date,
      },
    });
    return "created-session";
  }

  return "unknown-error";
};

export const getAllVideoSessions = async (userId: string) => {
  return db.video_session.findMany({
    where: {
      AND: [
        { userId1: { not: userId } },
        { userId2: { not: userId } },
      ],
    },
  });
}
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
    data: {
      status: "COMPLETED",
      endedAt: new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
    },
  });
};

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const APP_CERTIFICATE = process.env.NEXT_PUBLIC_AGORA_APP_CERTIFICATE!;


const generateAgoraUid = (userId: string): number => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 4294967295 || 1;
};



export const generateTokensForBothUsers = async (userId: string) => {
  const session = await db.video_session.findFirst({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId }
      ],
      status: "ACTIVE",
    },
  });
  if (!session || !session.userId1 || !session.userId2 || !session.topic) {
    return null;
  }

  const channelName = session.topic;
  const expireTime = Math.floor(Date.now() / 1000) + 86400; // 24h
  const uid1 = await generateAgoraUid(session.userId1);
  const uid2 = await generateAgoraUid(session.userId2);
  const tokenUser1 = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid1,
    RtcRole.PUBLISHER,
    expireTime
  );

  const tokenUser2 = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid2,
    RtcRole.PUBLISHER,
    expireTime
  );
  await db.video_session.update({
    where: { id: session.id },
    data: {
      tokenuser1: tokenUser1,
      tokenuser2: tokenUser2,
    },
  });
  console.log(uid1, uid2, tokenUser1, tokenUser2);

  return {
    user1: { uid: uid1, token: tokenUser1 },
    user2: { uid: uid2, token: tokenUser2 },
  };
};

export const getVideoSessionTopicAndToken = async (
  userId: string
): Promise<{ topic: string; token: string; uid: number } | null> => {
  const session = await db.video_session.findFirst({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId }
      ],
      status: "ACTIVE",
    },
  });

  if (!session) return null;

  // Generate UIDs for both users
  const uid1 = await generateAgoraUid(session.userId1);
  const uid2 = await generateAgoraUid(session.userId2);

  let token: string | null = null;
  let uid: number | null = null;

  if (session.userId1 === userId) {
    token = session.tokenuser1;
    uid = uid1;
  } else if (session.userId2 === userId) {
    token = session.tokenuser2;
    uid = uid2;
  }

  if (!token || !uid) return null;

  return {
    topic: session.topic,
    token,
    uid, // <-- This will now be the real UID, not 1 or 2
  };
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
  const userSession = await db.video_session.findMany({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId }
      ],
      status: "ACTIVE"
    },
  });
  if (userSession.length >= 3) {
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
  const joinsession = await db.video_session.findFirst({
    where: {
      OR: [
        { userId1: "" },
        { userId2: "" }
      ],
      topic: formattedTopic,
      status: "PENDING"
    },
  });
  if (joinsession) {
    return { status: "join-sesion", session: joinsession };
  }

  return { status: "no-session" };
};

// Get the first user's listdate for a session
export const getSessionListDates = async (sessionId: string) => {
  const session = await db.video_session.findUnique({
    where: { id: sessionId },
    select: { listdate: true },
  });
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

export const configpendingSession = async (
  userId: string,) => {
  const session = await db.video_session.findFirst({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId }
      ],
      status: "PENDING",
    },
    select: { id: true, topic: true },
  });
  return session ? { id: session.id, topic: session.topic } : null;
}

export const cancelPendingSessionById = async (sessionId: string) => {
  return db.video_session.update({
    where: { id: sessionId },
    data: { status: "CANCELLED" }
  });
};

export const checkSessionTimeOverlap = async (
  userId: string,
  priorities: string[]
): Promise<string[]> => {
  const userSessions = await db.video_session.findMany({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId }
      ],
      status: "ACTIVE"
    },
    select: { startedAt: true }
  });
  console.log("User sessions:", userSessions);
  if (!userSessions || userSessions.length === 0) return [];

  const thirtyMin = 30 * 60 * 1000;
  const overlappedPriorities: string[] = [];

  const parseRange = (range: string): [Date, Date] => {
    // Split only on the dash between the two date-times
    const [startStr, endStr] = range.split(/-(?=\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    // Add 7 hours (in ms)
    startDate.setHours(startDate.getHours() + 7);
    endDate.setHours(endDate.getHours() + 7);
    return [startDate, endDate];
  };

  priorities.forEach((priority, idx) => {
    const [priorityStart] = parseRange(priority);
    // Check against all active sessions
    console.log("Checking priority:", priority, "against user sessions");
    console.log("Priority start time:", priorityStart);
    const isOverlapped = userSessions.some(
      s =>
        s.startedAt &&
        priorityStart.getTime() >= new Date(s.startedAt).getTime() - thirtyMin &&
        priorityStart.getTime() <= new Date(s.startedAt).getTime() + thirtyMin
    );
    if (isOverlapped) {
      if (idx === 0) overlappedPriorities.push("First Priority Time");
      if (idx === 1) overlappedPriorities.push("Second Priority Time");
      if (idx === 2) overlappedPriorities.push("Third Priority Time");
    }
  });
  console.log("Overlapped priorities:", overlappedPriorities);
  return overlappedPriorities;
};


