"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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

  const [openTestModal, setOpenTestModal] = useState(false);

  const openModal = useCallback(() => setOpenTestModal(true), []);
  const closeModal = useCallback(() => setOpenTestModal(false), []);

  useEffect(() => {
    if (!openTestModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [openTestModal]);

  useEffect(() => {
    if (!openTestModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openTestModal, closeModal]);

  useEffect(() => {
    const fromSession = session?.user.englishLevel || null;
    if (fromSession) {
      setLevel(String(fromSession));
      setLoading(false);
      return;
    }
  }, [session]);

  // keep for legacy uses if needed
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
        <Button onClick={openModal} className="px-3 py-1">
          {level && level !== "Unrated" ? "Review / Retake" : "Take Test"}
        </Button>
      </div>

      {/* Test selection modal (animated, prevents body scroll, constrained height to avoid overflow) */}
      <AnimatePresence>
        {openTestModal && (
          <motion.div
            key="cefr-modal"
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={closeModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* panel */}
            <motion.div
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 z-10 max-h-[90vh] overflow-auto"
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Choose test type</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Pick a test to evaluate your grammar or listening skills.</p>
                </div>
                <button onClick={closeModal} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 ml-3">✕</button>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <Button onClick={() => router.push("/cefr-testing/grammar")} className="w-full px-4 py-2 bg-black text-white">Start Grammar Test</Button>
                <Button onClick={() => router.push("/cefr-testing/listening")} className="w-full px-4 py-2 border">Start Listening Test</Button>
                <Button onClick={closeModal} variant="ghost" className="w-full mt-2">Cancel</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}