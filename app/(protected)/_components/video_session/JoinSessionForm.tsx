"use client";
import { Button } from "@/components/ui/button";
import { getSessionListDates, joinSessionWithStartAt } from "@/actions/video-session";
import { useEffect, useState } from "react";

type Props = {
  pendingSession: any;
  selectedListDate: string;
  setSelectedListDate: (v: string) => void;
  setSessionResult: (msg: string | null) => void;
  setStep: (step: "check" | "create" | "join") => void;
  setPendingSession: (v: any) => void;
  setChecking: (v: boolean) => void;
  session: any;
};

function formatDateRange(dateRange: string) {
  const dashIdx = dateRange.indexOf("-", 11); // 11 is after 'YYYY-MM-DDT'
  const start = dateRange.slice(0, dashIdx).replace("T", " ");
  const end = dateRange.slice(dashIdx + 1).replace("T", " ");
  return `${start} ~ ${end}`;
}

const JoinSessionForm = ({
  pendingSession,
  selectedListDate,
  setSelectedListDate,
  setSessionResult,
  setStep,
  setPendingSession,
  setChecking,
  session,
}: Props) => {
  const [listDates, setListDates] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  useEffect(() => {
    if (pendingSession?.id) {
      getSessionListDates(pendingSession.id).then((dates) => {
        // Filter out "T-T"
        const filteredDates = Array.isArray(dates) ? dates.filter(d => d !== "T-T") : [];
        setListDates(filteredDates);
        setSelectedPeriod(""); // Reset selection on session change
      });
    } else {
      setListDates([]);
      setSelectedPeriod("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSession?.id]);

  const handleJoinSession = async () => {
    setChecking(true);
    setSessionResult(null);
    const userId = session.data?.user?.id || "";
    if (!userId || !pendingSession || !selectedPeriod) {
      setSessionResult("Please select a time.");
      setChecking(false);
      return;
    }
    // Always use the first period for startedAt, and ensure ISO format
    const dashIdx = listDates[0].indexOf("-", 11);
    let startedAtStr = listDates[0].slice(0, dashIdx);
    // Add seconds if missing
    if (startedAtStr.length === 16) startedAtStr += ":00";
    // Convert to Date object for Prisma
    const startedAt = new Date(startedAtStr);

    await joinSessionWithStartAt(pendingSession.id, userId, startedAt);
    setSessionResult("joined-session");
    setStep("check");
    setPendingSession(null);
    setChecking(false);
  };

  return (
    <>
      <div className="mb-4">
        <div className="font-semibold mb-2">Select a time from the first user:</div>
        {listDates.length === 0 ? (
          <div className="text-gray-500 text-sm mb-2">No available times to join.</div>
        ) : (
          <select
            className="border rounded px-2 py-1 w-full"
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
          >
            <option value="">Select a time</option>
            {listDates.map((date, idx) => (
              <option key={idx} value={date}>
                {formatDateRange(date)}
              </option>
            ))}
          </select>
        )}
      </div>
      <Button
        type="button"
        className="w-full"
        onClick={handleJoinSession}
        disabled={!selectedPeriod}
      >
        Join Session
      </Button>
    </>
  );
};

export default JoinSessionForm;