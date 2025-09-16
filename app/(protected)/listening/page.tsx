"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import listeningData from "../_components/cefr_lvl/listening.json";

type RawItem = any;
type Item =
  | { type: "instruction"; part: number; text: string }
  | { id: string; part: number; type: "fill"; prompt: string; answer?: string }
  | { id: string; part: number; type: "mcq"; prompt: string; options: string[]; answerIndex?: number }
  | { id: string; part: number; type: "multi-mcq"; prompt: string; options: string[]; answerIndex?: number[] };

export default function ListeningPage() {
  const router = useRouter();
  
  const closeResults = () => {
    setShowResults(false);
    router.push("/home");
  };
  
  // Audio ref — created only on client
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | number | number[]>>({});
  const [playing, setPlaying] = useState(false);
  const [currentPart, setCurrentPart] = useState<number>(1);

  // results state
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    correct: number;
    details: Record<string, { correct: boolean; expected: any; user: any; item: Item; correctCount?: number; expectedCount?: number }>;
  }>({ total: 0, correct: 0, details: {} });

  // pagination / compact controls (compact toggle kept, but pagination removed)
  const [page, setPage] = useState(1);
  const perPage = 8;

  useEffect(() => {
    const raw = (listeningData as RawItem[]) || [];
    const normalized: Item[] = raw.map((r) => {
      if (r.type === "instruction" || (r.text && !r.id && r.part)) {
        return { type: "instruction", part: r.part, text: r.text ?? "" };
      }

      if (r.options && typeof r.options === "object" && !Array.isArray(r.options)) {
        const letters = Object.keys(r.options);
        const opts = letters.map((k) => r.options[k]);
        const ans = r.answer;
        if (Array.isArray(ans)) {
          const idxs = (ans as string[]).map((L) => letters.indexOf(L)).filter(i => i >= 0);
          return { id: r.id, part: r.part, type: "multi-mcq", prompt: r.prompt, options: opts, answerIndex: idxs };
        } else {
          const idx = letters.indexOf(ans);
          return { id: r.id, part: r.part, type: "mcq", prompt: r.prompt, options: opts, answerIndex: idx >= 0 ? idx : undefined };
        }
      }

      if (r.options && Array.isArray(r.options)) {
        const opts = r.options as string[];
        const ans = r.answer;
        if (Array.isArray(ans)) {
          const idxs = (ans as string[]).map((L) => {
            if (typeof L === "string" && /^[A-Z]$/.test(L)) return L.charCodeAt(0) - 65;
            const parsed = Number(L);
            return isNaN(parsed) ? -1 : parsed;
          }).filter(i => i >= 0);
          return { id: r.id, part: r.part, type: "multi-mcq", prompt: r.prompt, options: opts, answerIndex: idxs };
        } else {
          let idx = -1;
          if (typeof ans === "string" && /^[A-Z]$/.test(ans)) idx = ans.charCodeAt(0) - 65;
          else if (typeof ans === "number") idx = ans;
          return { id: r.id, part: r.part, type: "mcq", prompt: r.prompt, options: opts, answerIndex: idx >= 0 ? idx : undefined };
        }
      }

      return { id: r.id, part: r.part, type: "fill", prompt: r.prompt, answer: r.answer };
    });

    setAllItems(normalized);
    const parts = Array.from(new Set(normalized.filter(i => i.type !== "instruction").map(i => (i as any).part))).sort((a,b) => a-b);
    if (parts.length) setCurrentPart(parts[0]);
  }, []);

  // create audio only on client side
  useEffect(() => {
    const a = new Audio("test1.mp3");
    a.preload = "auto";
    // keep a local reference
    audioRef.current = a;

    // ensure playing state resets when audio ends
    const onEnded = () => setPlaying(false);
    a.addEventListener("ended", onEnded);

    return () => {
      a.removeEventListener("ended", onEnded);
      try {
        a.pause();
      } catch {}
      audioRef.current = null;
    };
  }, []);

  const parts = Array.from(new Set(allItems.filter(i => i.type !== "instruction").map(i => (i as any).part))).sort((a,b) => a-b);
  const rawItemsFor = (p: number) => allItems.filter(i => (i as any).part === p && (i as any).type !== "instruction") as (Exclude<Item, { type: "instruction" }>[]);
  const instructionFor = (p: number) => (allItems.find(i => i.type === "instruction" && i.part === p) as any)?.text;

  // show all questions for the current part in the scrollable box
  const itemsFor = (p: number) => rawItemsFor(p);

  const totalPages = (p: number) => {
    const total = rawItemsFor(p).length;
    return Math.max(1, Math.ceil(total / perPage));
  };

  const onFill = (id: string, v: string) => setAnswers(s => ({ ...s, [id]: v }));
  const onPick = (id: string, idx: number) => setAnswers(s => ({ ...s, [id]: idx }));
  const onToggleMulti = (id: string, idx: number) => {
    setAnswers(s => {
      const cur = (s[id] as number[]) || [];
      return { ...s, [id]: cur.includes(idx) ? cur.filter(n => n !== idx) : [...cur, idx] };
    });
  };

  const startPlayback = () => {
    const a = audioRef.current;
    if (!a) return;

    a.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  };

  // safe helper that ensures an Audio exists and plays it
  const runAudio = () => {
    let a = audioRef.current;
    if (!a && typeof Audio !== "undefined") {
      a = new Audio("public/test1.mp3");
      a.preload = "auto";
      audioRef.current = a;
      a.addEventListener("ended", () => setPlaying(false));
    }
    if (!a) return;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const finish = () => {
    let total = 0;
    let correct = 0;
    const details: Record<string, { correct: boolean; expected: any; user: any; item: Item; correctCount?: number; expectedCount?: number }> = {};

    for (const it of allItems) {
      if (it.type === "instruction") continue;
      const id = (it as any).id;
      const user = answers[id];
      let isCorrect = false;
      let expected: any = null;
      let correctCount = 0;
      let expectedCount = 1; // default for single-question items

      if (it.type === "fill") {
        expected = (it as any).answer ?? "";
        // Do not change case of user or expected when comparing — compare trimmed strings exactly
        if (typeof user === "string" && typeof expected === "string" && user.trim() === expected.trim()) isCorrect = true;
        if (isCorrect) correct += 1;
        total += 1;
      } else if (it.type === "mcq") {
        expected = typeof (it as any).answerIndex === "number" ? (it as any).answerIndex : undefined;
        if (typeof user === "number" && typeof expected === "number" && user === expected) isCorrect = true;
        if (isCorrect) correct += 1;
        total += 1;
      } else if (it.type === "multi-mcq") {
        // count each expected option as a separate question
        expected = Array.isArray((it as any).answerIndex) ? (it as any).answerIndex : [];
        expectedCount = expected.length || 0;
        // count how many expected options the user selected
        if (Array.isArray(user) && Array.isArray(expected)) {
          const uSet = new Set(user as number[]);
          correctCount = (expected as number[]).reduce((acc, idx) => acc + (uSet.has(idx) ? 1 : 0), 0);
        } else {
          correctCount = 0;
        }
        correct += correctCount;
        total += expectedCount;
        isCorrect = correctCount === expectedCount && expectedCount > 0;
      }

      details[id ?? `idx-${Object.keys(details).length + 1}`] = { correct: isCorrect, expected, user, item: it, correctCount, expectedCount };
    }

    setResults({ total, correct, details });
    setShowResults(true);
  };

  // fmtTime kept but not used for now
  const fmtTime = (s: number) => {
    const m = Math.floor(s/60).toString().padStart(2,"0");
    const sec = (s%60).toString().padStart(2,"0");
    return `${m}:${sec}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Results modal */}
      {showResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* overlay blocks interaction with background but does NOT close the modal when clicked */}
          <div className="absolute inset-0 bg-black/40" />
           <div className="relative w-full max-w-3xl max-h-[90vh] overflow-auto bg-white rounded-2xl border shadow-lg p-6 z-10">
             <div className="flex items-start justify-between gap-4 mb-4">
               <div>
                 <h2 className="text-lg font-semibold">Your Listening Results</h2>
                 <div className="text-sm text-gray-600">Score: {results.correct} / {results.total}</div>
               </div>
               <div className="flex items-center gap-2">
             <button onClick={closeResults} className="px-3 py-1 rounded-md border bg-white text-sm">Return</button>
               </div>
             </div>

            <div className="space-y-3">
              {Object.entries(results.details).map(([id, d]) => {
                const it = d.item;
                const user = d.user;
                const expected = d.expected;
                const isCorrect = d.correct;

                const renderExpected = () => {
                  if (it.type === "fill") return String(expected ?? "");
                  if (it.type === "mcq" && Array.isArray((it as any).options)) {
                    const idx = expected as number | undefined;
                    return typeof idx === "number" ? `${String.fromCharCode(65 + idx)} — ${(it as any).options[idx]}` : "—";
                  }
                  if (it.type === "multi-mcq" && Array.isArray((it as any).options)) {
                    return (expected as number[]).map(i => `${String.fromCharCode(65 + i)} — ${(it as any).options[i]}`).join("; ");
                  }
                  return String(expected ?? "");
                };

                const renderUser = () => {
                  if (it.type === "fill") return user ?? "";
                  if (it.type === "mcq" && Array.isArray((it as any).options)) {
                    return typeof user === "number" ? `${String.fromCharCode(65 + user)} — ${(it as any).options[user]}` : "Not answered";
                  }
                  if (it.type === "multi-mcq" && Array.isArray((it as any).options)) {
                    return Array.isArray(user) && user.length ? user.map((i:number) => `${String.fromCharCode(65 + i)} — ${(it as any).options[i]}`).join("; ") : "Not answered";
                  }
                  return String(user ?? "");
                };

                return (
                  <div key={id} className="p-3 border rounded-lg bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-sm text-gray-700 font-medium">{(it as any).prompt}</div>
                        <div className="text-xs text-gray-500 mt-1">ID: {id}</div>
                        <div className="mt-2 text-xs">
                          <div><strong>Your answer:</strong> <span className="ml-2 text-gray-700">{renderUser()}</span></div>
                          <div className="mt-1"><strong>Correct:</strong> <span className="ml-2 text-gray-700">{renderExpected()}</span></div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 mt-1">
                        {it.type === "multi-mcq" ? (
                          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${((d.correctCount ?? 0) === (d.expectedCount ?? 0)) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {(d.correctCount ?? 0)}/{(d.expectedCount ?? 0)} correct
                          </div>
                        ) : (
                          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {isCorrect ? "Correct" : "Incorrect"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* removed hidden <audio> element */}

      <div
        className={`max-w-7xl mx-auto px-6 sm:px-8 py-8 ${showResults ? "pointer-events-none select-none" : ""}`}
        aria-hidden={showResults}
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
          {/* left: questions column */}
          <div>
            <div className="mb-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Listening — Test</h1>
                  <p className="text-sm text-gray-600 mt-1">Single recording. Play to begin.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => router.push("/")} className="px-3 py-1 border rounded-full text-sm bg-white hover:bg-gray-50">Cancel</button>
                  <button onClick={finish} className="px-3 py-1 border rounded-full text-sm bg-black text-white hover:opacity-95">Finish Test</button>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${playing ? "bg-green-100 text-green-800" : "bg-white border text-black"}`}>
                  {playing ? "Playing" : "Ready"}
                </div>

                <nav className="sm:ml-4 flex gap-2 flex-wrap">
                  {parts.map(p => (
                    <button
                      key={p}
                      onClick={() => { setCurrentPart(p); setPage(1); }}
                      className={`text-sm px-3 py-1 rounded-md ${currentPart === p ? "bg-black text-white" : "bg-white border text-black"}`}
                    >
                      Part {p}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            <div className="space-y-3">
              {instructionFor(currentPart) && (
                <div className="rounded-xl border border-gray-200 p-4 bg-white text-sm text-gray-700 shadow-sm">
                  <strong>Instructions:</strong>
                  <div className="mt-2 text-gray-600">{instructionFor(currentPart)}</div>
                </div>
              )}

              {/* scrollable questions box (renders all questions for the selected part) */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-md overflow-hidden">
                <div className="p-3">
                  <div className="max-h-[60vh] overflow-auto pr-2 space-y-3">
                    {itemsFor(currentPart).map((it, idx) => (
                      <div
                        key={(it as any).id}
                        className="p-4 bg-white border border-gray-100 rounded-xl flex flex-col md:flex-row items-start gap-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="w-full md:w-24 text-xs text-gray-500 pt-1 break-words">
                          {(it as any).id}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-800 leading-relaxed break-words">
                            {(it as any).prompt}
                          </div>
                        </div>

                        <div className="w-full md:w-44 flex-shrink-0 flex items-center justify-end">
                          {it.type === "fill" && (
                            <input
                              value={(answers[(it as any).id] as string) || ""}
                              onChange={e => onFill((it as any).id, e.target.value)}
                              className="w-full md:w-36 border border-gray-200 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                              placeholder=""
                            />
                          )}

                          {it.type === "mcq" && it.options && (
                            <div className="flex flex-col gap-2 items-end">
                              {it.options.map((opt, oIdx) => {
                                const sel = answers[(it as any).id] === oIdx;
                                return (
                                  <label key={oIdx} className="flex items-center gap-3 text-sm cursor-pointer select-none text-gray-700">
                                    <input
                                      type="radio"
                                      name={(it as any).id}
                                      checked={sel as boolean}
                                      onChange={() => onPick((it as any).id, oIdx)}
                                      className="w-4 h-4 text-black"
                                    />
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold">{String.fromCharCode(65 + oIdx)}</span>
                                      <span className="text-xs text-gray-600 max-w-[200px] truncate">{opt}</span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {it.type === "multi-mcq" && it.options && (
                            <div className="flex flex-col gap-2 items-end">
                              {it.options.map((opt, oIdx) => {
                                const cur = (answers[(it as any).id] as number[]) || [];
                                const sel = cur.includes(oIdx);
                                return (
                                  <label key={oIdx} className="flex items-center gap-3 text-sm cursor-pointer select-none text-gray-700">
                                    <input
                                      type="checkbox"
                                      checked={sel}
                                      onChange={() => onToggleMulti((it as any).id, oIdx)}
                                      className="w-4 h-4 text-black"
                                    />
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold">{String.fromCharCode(65 + oIdx)}</span>
                                      <span className="text-xs text-gray-600 max-w-[200px] truncate">{opt}</span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* pagination removed - all questions for the part are shown in the scroll box */}
            </div>
          </div>

          {/* right: sticky audio card */}
          <aside className="hidden md:block">
            <div className="sticky top-8 w-80 p-4 border border-gray-200 rounded-2xl bg-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={runAudio}
                  disabled={playing}
                  aria-disabled={playing}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 border border-black rounded-full text-sm bg-white ${playing ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
                  aria-label="Play audio"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play
                </button>
                <div className="text-sm text-gray-600">File ready</div>
              </div>


              <div className="text-xs text-gray-500 mt-3">Controls are hidden to prevent pausing/rewinding.</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}