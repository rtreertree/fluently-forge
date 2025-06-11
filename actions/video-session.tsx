"use server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

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

