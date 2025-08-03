"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import PriorityTimeSelector from "../../_components/video_session/prioityTimeSelector";
import { isVideoSessionActive, checkSessionTimeOverlap } from "@/actions/video-session";
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
  const [enablePriority2, setEnablePriority2] = useState(false);
  const [enablePriority3, setEnablePriority3] = useState(false);

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
      enablePriority2
        ? `${values.priority2.startDate}T${values.priority2.startTime}-${values.priority2.endDate}T${values.priority2.endTime}`
        : "",
      enablePriority3
        ? `${values.priority3.startDate}T${values.priority3.startTime}-${values.priority3.endDate}T${values.priority3.endTime}`
        : "",
    ].filter(Boolean);

    // Use backend function to check for overlap
    const overlappedPriorities = await checkSessionTimeOverlap(userId, priorities);

    if (overlappedPriorities.length > 0) {
      setSessionResult(
        `You have another session that overlaps with: ${overlappedPriorities.join(
          ", "
        )} (within 30 minutes).`
      );
      setChecking(false);
      return;
    }

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
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enablePriority2"
            checked={enablePriority2}
            onChange={() => setEnablePriority2((v) => !v)}
          />
          <label htmlFor="enablePriority2" className="text-sm">
            Enable Second Priority Time
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enablePriority3"
            checked={enablePriority3}
            onChange={() => setEnablePriority3((v) => !v)}
          />
          <label htmlFor="enablePriority3" className="text-sm">
            Enable Third Priority Time
          </label>
        </div>
      </div>
      {/* Priority selectors */}
      <div className="w-full">
        <PriorityTimeSelector name="priority1" label="First Priority Time" />
      </div>
      {enablePriority2 && (
        <div className="w-full">
          <PriorityTimeSelector name="priority2" label="Second Priority Time" />
        </div>
      )}
      {enablePriority3 && (
        <div className="w-full">
          <PriorityTimeSelector name="priority3" label="Third Priority Time" />
        </div>
      )}
      <Button
        type="button"
        variant="secondary"
        className="w-full mt-2"
        onClick={() => {
          window.location.href = "/video-call/create";
          form.reset();
        }}
      >
        Change Topic/Back
      </Button>
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