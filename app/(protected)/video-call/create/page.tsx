"use client";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  getPendingSessionByTopic,
  generateTokensForBothUsers,
  getUserVideoSession,
} from "@/actions/video-session";
import CreateSessionForm from "@/app/(protected)/_components/video_session/createsessionForm";
import JoinSessionForm from "@/app/(protected)/_components/video_session/JoinSessionForm";

const timeRangeSchema = z.object({
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
});

const videoCallSchema = z.object({
  prompt: z.string().min(1, "Topic is required").max(80, "Your prompt must be less than 80 characters"),
  priority1: timeRangeSchema,
  priority2: timeRangeSchema,
  priority3: timeRangeSchema,
});

const Page = () => {
  const [step, setStep] = useState<"check" | "create" | "join">("check");
  const [sessionResult, setSessionResult] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<any>(null);
  const [selectedListDate, setSelectedListDate] = useState<string>("");
  const [checking, setChecking] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [userSession, setUserSession] = useState<any>(null);

  const session = useSession();

  // Fetch user's session on mount and when sessionResult changes
  useEffect(() => {
    const fetchSession = async () => {
      const userId = session.data?.user?.id;
      if (!userId) return;
      const sessionData = await getUserVideoSession(userId);
      setUserSession(sessionData); // Only set if sessionData exists
    };
    fetchSession();
  }, [session.data?.user?.id]);

  const form = useForm<z.infer<typeof videoCallSchema>>({
    resolver: zodResolver(videoCallSchema),
    defaultValues: {
      prompt: "",
      priority1: { startDate: "", startTime: "", endDate: "", endTime: "" },
      priority2: { startDate: "", startTime: "", endDate: "", endTime: "" },
      priority3: { startDate: "", startTime: "", endDate: "", endTime: "" },
    },
  });

  const handleCheckAvailability = async () => {
    setChecking(true);
    setSessionResult(null);
    setServerStatus(null);
    const userId = session.data?.user?.id || "";
    if (!userId) {
      setSessionResult("User not authenticated.");
      setChecking(false);
      return;
    }
    const topic = form.getValues("prompt");
    if (!topic) {
      setSessionResult("Please enter a topic.");
      setChecking(false);
      return;
    }
    const result = await getPendingSessionByTopic(userId, topic);
    setServerStatus(result.status);

    if (result.status === "already-in-session") {
      setSessionResult("You are already in an active session.");
      // Do NOT setPendingSession or setStep here
      setChecking(false);
      return;
    }

    if (result.status === "pending-session" && result.session) {
      setPendingSession(result.session);
      setSessionResult("you are in this session already.");
      setChecking(false);
      return;
    }
    if (result.status === "join-sesion" && result.session) {
      setPendingSession(result.session);
      setSessionResult("You can join this session.");
      setStep("join");
      setChecking(false);
      return;
    }

    setStep("create");
    setChecking(false);
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Video Call</h1>
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg flex flex-col items-center">
        <Form {...form}>
          <form
            onSubmit={step === "create" ? form.handleSubmit(() => {}) : e => { e.preventDefault(); }}
            className="space-y-8 w-full"
          >
            {sessionResult && (
              <div className="bg-gray-100 p-3 rounded-md text-gray-800 flex flex-col gap-y-2 select-none">
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
                      disabled={step !== "check"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {step === "check" && (
              <Button
                type="button"
                className="w-full"
                onClick={handleCheckAvailability}
                disabled={checking}
              >
                Check Availability
              </Button>
            )}
            {step === "create" && (
              <CreateSessionForm
                session={session}
                setSessionResult={setSessionResult}
                setStep={setStep}
                form={form}
                setChecking={setChecking}
              />
            )}
            {step === "join" && (
              <JoinSessionForm
                pendingSession={pendingSession}
                selectedListDate={selectedListDate}
                setSelectedListDate={setSelectedListDate}
                setSessionResult={setSessionResult}
                setStep={setStep}
                setPendingSession={setPendingSession}
                setChecking={setChecking}
                session={session}
              />
            )}
          </form>
        </Form>
      </div>
      {userSession && (
        <div className="mt-6 w-full max-w-md bg-green-50 p-4 rounded-lg shadow flex flex-col items-center">
          <div className="mb-2 text-green-800 font-semibold">
            You are already in an active session: {userSession.topic}
          </div>
          <Button
            className="w-full"
            onClick={async () => {
              await generateTokensForBothUsers(session.data?.user?.id || "");
              window.location.href = `/video-call/meeting?sessionId=${userSession.id}`;
            }}
          >
            Join Session
          </Button>
        </div>
      )}
    </div>
  );
};

export default Page;