"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type CerfBoxProps = {
  sessionId?: string;
  label?: string;
  className?: string;
};

export default function CerfBox({
  sessionId,
  label = "Your CEFR Level",
  className = "",
}: CerfBoxProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [level, setLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const fromSession = session?.user.englishLevel || null;
    if (fromSession) {
      setLevel(String(fromSession));
      setLoading(false);
      return;
    }
  }, [session]);

  const handleRedirect = useCallback(() => {
    router.push("/cefr-testing");
  }, [router]);

  return (
    <div className={`max-w-sm w-full bg-white dark:bg-slate-900 rounded-xl shadow-md border p-4 ${className}`}>
      <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">{label}</div>

      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">CEFR</div>

          {loading ? (
            <div className="text-xl font-semibold text-slate-700 dark:text-slate-200">Loading…</div>
          ) : error ? (
            <div className="text-sm text-red-600 dark:text-red-400">Error</div>
          ) : (
            <div className="text-2xl font-semibold text-slate-900 dark:text-white">{level ?? "Unrated"}</div>
          )}
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">Status</div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {!loading && !error ? (level === "Unrated" ? "Not taken" : "Completed") : "—"}
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-400">
        {updatedAt && !loading ? `Last checked: ${updatedAt}` : null}
        {error ? <div className="text-xs text-red-500 mt-1">{error}</div> : null}
      </div>

      <div className="mt-4 flex justify-center">
        <Button onClick={handleRedirect} className="px-3 py-1">
          {level && level !== "Unrated" ? "Review / Retake" : "Take Test"}
        </Button>
      </div>
    </div>
  );
}