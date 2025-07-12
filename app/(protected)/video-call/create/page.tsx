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
  getAllVideoSessions,
  cancelOldPendingSessions,
  cancelExceedingAppointmentSession,
} from "@/actions/video-session";
import { validateTopic } from "@/actions/openaiHandler";
import CreateSessionForm from "@/app/(protected)/_components/video_session/createsessionForm";
import JoinSessionForm from "@/app/(protected)/_components/video_session/JoinSessionForm";
import Loader from "@/components/suspend/loading";

const timeRangeSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().min(1, "End date is required"),
  endTime: z.string().min(1, "End time is required"),
});

const optionalTimeRangeSchema = z.object({
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
});

const videoCallSchema = z.object({
  prompt: z.string().min(1, "Topic is required").max(80, "Your prompt must be less than 80 characters"),
  priority1: timeRangeSchema, // mandatory
  priority2: optionalTimeRangeSchema.optional(), // optional
  priority3: optionalTimeRangeSchema.optional(), // optional
});

const Page = () => {
  const [step, setStep] = useState<"check" | "create" | "join">("check");
  const [sessionResult, setSessionResult] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<any>(null);
  const [selectedListDate, setSelectedListDate] = useState<string>("");
  const [checking, setChecking] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [userSession, setUserSession] = useState<any>(null);
  const [activeTopics, setActiveTopics] = useState<string[]>([]);

  const session = useSession();


  // Cancel old pending sessions on mount
  useEffect(() => {
    cancelOldPendingSessions();
    cancelExceedingAppointmentSession();
  }, []);

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

  // Fetch all active topics for suggestion
  useEffect(() => {
    const fetchTopics = async () => {
      const sessions = await getAllVideoSessions();
      const topics = Array.from(new Set((sessions || [])
        .filter((s: any) =>
          s.status === "PENDING" &&
          s.topic &&
          (s.userId1 === "" || s.userId2 === "")
        )
        .map((s: any) => s.topic)));
      setActiveTopics(topics);
    };
    fetchTopics();
  }, []);

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

    // Use OpenAI validation for topic
    const isValid = await validateTopic(topic, "MONOLOGUE"); // or the correct SessionType
    if (!isValid) {
      setSessionResult("This topic is not allowed. Please choose another topic.");
      setChecking(false);
      return;
    }

    const result = await getPendingSessionByTopic(userId, topic);
    setServerStatus(result.status);

    if (result.status === "already-in-session") {
      setSessionResult("You are already in an active session.");
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

  const handleTopicSelect = (topic: string) => {
    form.setValue("prompt", topic);
  };

  if (checking) {
    return (
      <Loader text="loading" />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5 bg-gray-50 relative">
      <h1 className="text-2xl font-bold mb-4">Video Call</h1>

      <div className="flex gap-6 w-full max-w-5xl justify-center items-start">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg flex flex-col items-center mx-auto">
          <Form {...form}>
            <form
              onSubmit={step === "create" ? form.handleSubmit(() => { }) : e => { e.preventDefault(); }}
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
                      <input
                        type="text"
                        placeholder="Enter or select a topic"
                        {...field}
                        className="min-h-[40px] resize-none w-full border rounded p-2"
                        disabled={step !== "check"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-center">
                {step === "check" && (
                  <Button
                    type="button"
                    className="w-full max-w-md"
                    onClick={handleCheckAvailability}
                    disabled={checking}
                  >
                    Check Availability
                  </Button>
                )}
                {step === "create" && (
                  <div className="w-full max-w-md">
                    <CreateSessionForm
                      session={session}
                      setSessionResult={setSessionResult}
                      setStep={setStep}
                      form={form}
                      setChecking={setChecking}
                    />
                  </div>
                )}
                {step === "join" && (
                  <div className="w-full max-w-md">
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
                  </div>
                )}
              </div>
            </form>
          </Form>
        </div>

        {step === "check" && (
          <div className="w-80 bg-white rounded-xl shadow-lg h-fit absolute right-0 top-0 mt-4 mr-4">
            <div className="p-4 border-b bg-gray-50 rounded-t-xl">
              <h3 className="font-semibold text-lg text-gray-800">Available Topics</h3>
              <p className="text-sm text-gray-600 mt-1">
                {activeTopics.length > 0 ? 'Click any topic to select it' : 'No topics available'}
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {activeTopics.length > 0 ? (
                activeTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="p-4 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handleTopicSelect(topic)}
                  >
                    <div className="text-sm text-gray-800 break-words">
                      {topic}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <p>No available topics at the moment.</p>
                  <p className="text-xs mt-2">Topics will appear here when other users create sessions.</p>
                </div>
              )}
            </div>
          </div>
        )}
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