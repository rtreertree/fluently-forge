"use client";

import React, { useEffect, useState, startTransition } from "react";
import Loader from "@/components/suspend/loading";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { saveCefrResult } from "@/actions/cefr-level";
import type { EnglishLevel } from "@prisma/client";

import questionsData from "../../_components/cefr_lvl/question.json";

type Question = { id: string; text: string; choices: string[]; answer: string; level?: string };

const LEVEL_WEIGHTS: Record<string, number> = { A1: 0.1, A2: 0.2, B1: 0.3, B2: 0.4, C1: 0.5, C2: 0.6 };
const TOTAL = 30;
const TIME_LIMIT_SECONDS = 30 * 60; // 30 minutes

export default function CerfTestingPage() {
  const session = useSession();
  const userId = session.data?.user?.id || "";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviewMode, setReviewMode] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [predictedLevel, setPredictedLevel] = useState<string | null>(null);

  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT_SECONDS);
  const [timeUp, setTimeUp] = useState(false);

  const shuffle = <T,>(arr: T[]) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  useEffect(() => {
    setLoading(true);
    const levels = Object.keys(LEVEL_WEIGHTS);
    const perLevel = 5;
    const finalSet: Question[] = [];
    for (const lvl of levels) {
      const pool = (questionsData as Question[]).filter((q) => q.level === lvl);
      finalSet.push(...shuffle(pool).slice(0, Math.min(perLevel, pool.length)).map((q) => ({ ...q, choices: shuffle(q.choices), level: lvl })));
    }
    const selection = shuffle(finalSet).slice(0, Math.min(TOTAL, finalSet.length));
    setQuestions(selection);
    setLoading(false);
  }, []);

  // countdown timer
  useEffect(() => {
    if (reviewMode) return;
    setSecondsLeft(TIME_LIMIT_SECONDS);
    setTimeUp(false);
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setTimeUp(true);
          doSubmit(true); // auto-submit when time runs out
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewMode, questions.length]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const selectChoice = (qId: string, choice: string) => {
    if (reviewMode || timeUp) return;
    setAnswers((s) => ({ ...s, [qId]: choice }));
  };

  const goNext = () => setCurrent((c) => Math.min(questions.length - 1, c + 1));
  const goPrev = () => setCurrent((c) => Math.max(0, c - 1));

  function calculateWeightedResult(questions: Question[], answers: Record<string, string>) {
    const levelScores: Record<string, { score: number; possible: number; percent: number }> = {};
    for (const lvl of Object.keys(LEVEL_WEIGHTS)) levelScores[lvl] = { score: 0, possible: 0, percent: 0 };
    let totalScore = 0, totalPossible = 0;
    for (const q of questions) {
      const lvl = q.level ?? "A1";
      const weight = LEVEL_WEIGHTS[lvl] ?? 0;
      levelScores[lvl].possible += weight;
      totalPossible += weight;
      if (answers[q.id] === q.answer) { levelScores[lvl].score += weight; totalScore += weight; }
    }
    for (const lvl of Object.keys(levelScores)) { const s = levelScores[lvl]; s.percent = s.possible ? (s.score / s.possible) * 100 : 0; }
    const levels: EnglishLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const idx = Math.max(0, Math.min(levels.length - 1, Math.floor(totalScore / 1.75)));
    const predicted = levels[idx];
    return { levelScores, predicted, weightedPercent: totalPossible ? (totalScore / totalPossible) * 100 : 0, totalScore, totalPossible };
  }

  // common submit, auto=true allows partial answers
  const doSubmit = (auto = false) => {
    if (!auto && Object.keys(answers).length < questions.length) return;
    const correct = questions.reduce((acc, q) => acc + (answers[q.id] === q.answer ? 1 : 0), 0);
    setScore(correct);
    const { predicted } = calculateWeightedResult(questions, answers);
    setPredictedLevel(predicted);
    setReviewMode(true);
    setCurrent(0);
    startTransition(() => { saveCefrResult(userId,predicted);});
  };

  const handleSubmit = () => doSubmit(false);

  const handleRetake = () => {
    setAnswers({}); setReviewMode(false); setScore(null); setCurrent(0);
    setQuestions((qs) => shuffle(qs).map((q) => ({ ...q, choices: shuffle(q.choices) })));
    setSecondsLeft(TIME_LIMIT_SECONDS); setTimeUp(false);
  };

  const handleFinish = () => router.push("/");

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader text="loading" /></div>;
  if (!questions.length) return <div className="min-h-screen flex items-center justify-center">No questions available</div>;

  if (reviewMode) {
    const qr = questions[current];
    const userSel = answers[qr.id];
    const correctIdx = qr.choices.findIndex((c) => c === qr.answer);
    const userIdx = qr.choices.findIndex((c) => c === userSel);
    const correctLetter = correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : "-";
    const userLetter = userIdx >= 0 ? String.fromCharCode(65 + userIdx) : null;
    return (
      <div className="max-w-5xl mx-auto p-8 min-h-screen">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">CEFR Diagnostic — Review</h1>
            <p className="text-sm text-slate-500 mt-1">{score} / {questions.length} correct</p>
            <div className="text-xs text-slate-400 mt-1">Reviewing question {current + 1} of {questions.length}</div>
            {predictedLevel && <div className="mt-2 text-sm">Predicted CEFR level: <strong>{predictedLevel}</strong></div>}
          </div>
          <div className="text-sm text-slate-500">Progress<div className="w-48 mt-2 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden"><div className="bg-blue-600 h-3 rounded-full" style={{ width: `${Math.round(((current + 1) / questions.length) * 100)}%` }} /></div><div className="text-xs text-slate-400 mt-2">{current + 1} / {questions.length}</div></div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <main className="lg:col-span-7">
            <article id={`q-${current}`} className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="text-sm text-slate-400">Question {current + 1}</div>
                <h3 className="text-lg font-medium mt-2">{qr.text}</h3>
                <div className="mt-4 flex items-center gap-3">
                  <div className={`text-sm font-semibold px-3 py-1 rounded-full ${userSel === qr.answer ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{userSel === qr.answer ? "Correct" : "Incorrect"}</div>
                  <div className="text-sm text-slate-500">Correct: <span className="font-medium ml-1">{correctLetter} — {qr.answer}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                {qr.choices.map((choice, idx) => {
                  const isCorrect = choice === qr.answer; const isUser = choice === userSel;
                  const bgClass = isCorrect ? "bg-emerald-50 border-emerald-400" : isUser ? "bg-red-50 border-red-300" : "bg-white border-slate-200 dark:bg-slate-800";
                  const textClass = isCorrect ? "text-emerald-800" : isUser ? "text-red-800" : "text-slate-700";
                  return <div key={idx} className={`p-4 rounded-lg border ${bgClass}`}><div className="flex items-center gap-3"><div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${isCorrect ? "bg-emerald-500 text-white" : isUser ? "bg-red-500 text-white" : "bg-slate-100 text-slate-700"}`}>{String.fromCharCode(65 + idx)}</div><div className={`${textClass}`}>{choice}</div></div>{isCorrect && <div className="text-xs text-emerald-700 mt-2">Correct answer</div>}{isUser && !isCorrect && <div className="text-xs text-red-700 mt-2">Your answer {userLetter ? `(${userLetter})` : ""}</div>}</div>;
                })}
              </div>

              <footer className="mt-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button onClick={goPrev} disabled={current === 0}>Previous</Button>
                  <Button onClick={goNext} disabled={current === questions.length - 1}>Next</Button>
                  <div className="text-sm text-slate-500 ml-4">{Object.keys(answers).length} / {questions.length} answered</div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={() => { setReviewMode(false); }} className="px-4 py-2">Back to Test</Button>
                  <Button onClick={handleRetake}>Retake</Button>
                  {/* Finish button hidden on review page */}
                </div>
              </footer>
            </article>
          </main>

          <aside className="lg:col-span-5 sticky top-24 h-fit">
            <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm">
              <div className="text-sm text-slate-500 mb-3">Questions</div>
              <div className="space-y-2 max-h-[50vh] overflow-auto pr-2">
                {questions.map((q, i) => {
                  const user = answers[q.id]; const correct = user === q.answer;
                  return <button key={q.id} onClick={() => setCurrent(i)} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${i === current ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}><div className={`w-10 h-10 flex items-center justify-center rounded-full font-semibold ${correct ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>{i + 1}</div><div className="flex-1 text-sm"><div className="truncate">{`${q.id}: ${q.answer}`}</div><div className="text-xs text-slate-400 mt-0.5">{correct ? "Correct" : "Incorrect"}</div></div></button>;
                })}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Button onClick={() => setCurrent(0)}>First</Button>
                <Button onClick={() => setCurrent(questions.length - 1)}>Last</Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="max-w-5xl mx-auto p-8 min-h-screen flex items-start justify-center">
      <div className="w-full lg:w-3/4">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold leading-tight">CEFR Diagnostic Test</h1>
            <p className="text-sm text-slate-500 mt-1">30 questions • No repetition • Choose the best answer</p>
          </div>

          <div className="text-right">
            <div className="text-sm text-slate-500">Time left</div>
            <div className={`w-32 mt-2 rounded-full h-8 flex items-center justify-center ${secondsLeft <= 60 ? "bg-red-50 text-red-600" : "bg-slate-100"}`}>
              <div className="font-mono text-sm">{fmt(secondsLeft)}</div>
            </div>
            <div className="text-xs text-slate-400 mt-2">{current + 1} / {questions.length}</div>
          </div>
        </header>

        <main className="bg-white dark:bg-slate-900 border rounded-2xl p-8 shadow-lg">
          <section className="mb-6">
            <div className="text-sm text-slate-400 mb-2">Question {current + 1}</div>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white leading-snug">{q.text}</h2>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {q.choices.map((choice, idx) => {
              const selected = answers[q.id] === choice;
              return (
                <button key={idx} onClick={() => selectChoice(q.id, choice)} aria-pressed={selected} className={`text-left p-5 rounded-xl border transition-shadow duration-150 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 ${selected ? "bg-blue-50 border-blue-400 shadow-md dark:bg-blue-900/30" : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700"}`} disabled={timeUp}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full text-lg font-bold ${selected ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"}`}>{String.fromCharCode(65 + idx)}</div>
                    <div className="flex-1"><div className="text-lg font-medium">{choice}</div></div>
                  </div>
                </button>
              );
            })}
          </section>

          <footer className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button onClick={goPrev} disabled={current === 0}>Previous</Button>
              {current === questions.length - 1 ? (
                <Button onClick={handleSubmit}  disabled={Object.keys(answers).length < questions.length} className="px-4 py-2 bg-indigo-600 text-white">Finish</Button>
              ) : (
                <Button onClick={goNext} disabled={current === questions.length - 1}>Next</Button>
              )}
              <div className="text-sm text-slate-500 ml-4">{Object.keys(answers).length} / {questions.length} answered</div>
            </div>
          </footer>
        </main>

        <div className="mt-6 text-center text-sm text-slate-500">Take your time — your results will be saved and available to review after submission.</div>
      </div>
    </div>
  );
}