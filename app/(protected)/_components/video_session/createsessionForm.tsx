"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import PriorityTimeSelector from "../../_components/video_session/prioityTimeSelector";
import { isVideoSessionActive } from "@/actions/video-session";
import * as z from "zod";

type Props = {
  session: any;
  setSessionResult: (msg: string | null) => void;
  setStep: (step: "check" | "create" | "join") => void;
  form: any;
  setChecking: (v: boolean) => void;
};

const CreateSessionForm = ({
  session,
  setSessionResult,
  setStep,
  form,
  setChecking,
}: Props) => {
  const [activeResult, setActiveResult] = useState<string | null>(null);

  const handleCreateSession = async (values: z.infer<any>) => {
    setChecking(true);
    setSessionResult(null);
    setActiveResult(null);
    const userId = session.data?.user?.id || "";
    if (!userId) {
      setSessionResult("User not authenticated.");
      setChecking(false);
      return;
    }
    const priorities = [
      `${values.priority1.startDate}T${values.priority1.startTime}-${values.priority1.endDate}T${values.priority1.endTime}`,
      `${values.priority2.startDate}T${values.priority2.startTime}-${values.priority2.endDate}T${values.priority2.endTime}`,
      `${values.priority3.startDate}T${values.priority3.startTime}-${values.priority3.endDate}T${values.priority3.endTime}`,
    ];

    const createResult = await isVideoSessionActive(userId, values.prompt, priorities);
    setActiveResult(createResult);

    setTimeout(() => {
      setSessionResult("Session created!");
      setStep("check");
      form.reset();
      setChecking(false);
    }, 1500);
  };

  return (
    <div className="space-y-8 w-full">
      <PriorityTimeSelector name="priority1" label="First Priority Time" />
      <PriorityTimeSelector name="priority2" label="Second Priority Time" />
      <PriorityTimeSelector name="priority3" label="Third Priority Time" />
      <Button
        type="button"
        className="w-full"
        onClick={() => form.handleSubmit(handleCreateSession)()}
      >
        Create Session
      </Button>
    </div>
  );
};

export default CreateSessionForm;