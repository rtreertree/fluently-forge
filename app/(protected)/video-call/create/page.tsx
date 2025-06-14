"use client";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { isVideoSessionActive, getUserVideoSession, generateAndStoreToken } from "@/actions/video-session";
import { useSession } from "next-auth/react";

const videoCallSchema = z.object({
  prompt: z.string().min(1, "Topic is required").max(80, "Your prompt must be less than 80 characters"),
});

const VideoCallPage = () => {
  const [sessionResult, setSessionResult] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);

  const session = useSession();

  // Fetch user's session on mount and when sessionResult changes
  useEffect(() => {
    const fetchSession = async () => {
      const userId = session.data?.user?.id;
      if (!userId) return;
      const sessionData = await getUserVideoSession(userId);
      setUserSession(sessionData);
    };
    fetchSession();
  }, [session.data?.user?.id, sessionResult]);

  const form = useForm<z.infer<typeof videoCallSchema>>({
    resolver: zodResolver(videoCallSchema),
    defaultValues: {
      prompt: "",
    },
  });

  async function onSubmit(values: z.infer<typeof videoCallSchema>) {
    setChecking(true);
    setSessionResult(null);
    const userId = session.data?.user?.id || "";
    if (!userId) {
      setSessionResult("User not authenticated.");
      setChecking(false);
      return;
    }
    const result = await isVideoSessionActive(userId, values.prompt);
    setSessionResult(result);
    setChecking(false);
  }

  // Handler for the single Join Session button
  const handleJoinSession = async () => {
    if (!userSession) return;
    await generateAndStoreToken(session.data?.user?.id || "");
    window.location.href = `/video-call/meeting?sessionId=${userSession.id}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Video Call</h1>
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg flex flex-col items-center">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
            {sessionResult && (
              <div className="bg-gray-100 p-3 rounded-md text-gray-800 flex items-center gap-x-2 select-none">
                <pre className="whitespace-pre-wrap break-all">{sessionResult}</pre>
              </div>
            )}
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your video-call topic"
                      {...field}
                      className="min-h-[80px] resize-none"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={checking}>
              Start Video Call
            </Button>
          </form>
        </Form>
      </div>
      {userSession && (
        <div className="mt-6 w-full max-w-md bg-green-50 p-4 rounded-lg shadow flex flex-col items-center">
          <div className="mb-2 text-green-800 font-semibold">
            Your Session: {userSession.topic}
          </div>
          <Button
            className="w-full"
            onClick={handleJoinSession}
          >
            Join Session
          </Button>
        </div>
      )}
    </div>
  );
};

export default VideoCallPage;