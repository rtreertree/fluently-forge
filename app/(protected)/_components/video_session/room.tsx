"use client";
import React, { useEffect, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { VideoPlayer } from './videoplayer';
import type { ICameraVideoTrack, IMicrophoneAudioTrack, IRemoteVideoTrack, IRemoteAudioTrack, IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const TOKEN =
  "007eJxTYHg+iUlOs3Lfcl8Xg6N/lLY+CTuikXXD5N/OKNerTUtcEz0UGFJSLMzNTRItzCzMDEwSTSwtLA1SDM1SEs1SUo0tzS3NeJ55ZzQEMjKs3LaaiZEBAkF8doa81PKS1OISBgYArFAg0g==";
const CHANNEL = 'newtest';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

type User = {
  uid: string | number;
  videoTrack?: ICameraVideoTrack | IRemoteVideoTrack;
  audioTrack?: IMicrophoneAudioTrack | IRemoteAudioTrack;
};

export const VideoRoom = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let isJoined = false;
    let tracks: [IMicrophoneAudioTrack, ICameraVideoTrack] = [null!, null!];

    const handleUserJoined = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'video') setUsers(prev => [...prev, user]);
    };

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      setUsers(prev => prev.filter(u => u.uid !== user.uid));
    };

    client.on('user-published', handleUserJoined);
    client.on('user-left', handleUserLeft);

    client
      .join(APP_ID, CHANNEL, TOKEN, null)
      .then((uid) =>
        Promise.all([
          AgoraRTC.createMicrophoneAndCameraTracks(),
          uid,
        ])
      )
      .then(([[audioTrack, videoTrack], uid]) => {
        tracks = [audioTrack, videoTrack];
        setUsers(prev => [
          ...prev,
          { uid, videoTrack, audioTrack },
        ]);
        isJoined = true;
        client.publish([audioTrack, videoTrack]);
      });

    return () => {
      tracks.forEach(track => {
        if (track) {
          track.stop();
          track.close();
        }
      });
      client.off('user-published', handleUserJoined);
      client.off('user-left', handleUserLeft);
      if (isJoined) {
        client.unpublish(tracks).then(() => client.leave());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 200px)' }}>
        {users.map(user => (
          <VideoPlayer user={user} />
        ))}
      </div>
    </div>
  );
};