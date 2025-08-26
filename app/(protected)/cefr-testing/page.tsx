"use client";

import React, { useEffect, useState, startTransition } from "react";
import Loader from "@/components/suspend/loading";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { saveCefrResult } from "@/actions/cefr-level";
import type { EnglishLevel } from "@prisma/client";

type Question = {
  id: string;
  text: string;
  choices: string[];
  answer: string;
  level?: string; // added: track CEFR level per question
};

const FALLBACK_QUESTIONS_BY_LEVEL: Record<string, Question[]> = {
  A1: [
    { id: "q1", text: "Choose the correct past tense of 'go'.", choices: ["goed", "went", "gone", "goes"], answer: "went" },
    { id: "q2", text: "Which is a synonym of 'happy'?", choices: ["sad", "angry", "joyful", "cold"], answer: "joyful" },
    { id: "q3", text: "Pick the correct article: ____ apple.", choices: ["a", "an", "the", "none"], answer: "an" },
    { id: "q4", text: "Which word is an adjective?", choices: ["run", "quick", "happen", "sing"], answer: "quick" },
    { id: "q5", text: "Select the plural form of 'mouse'.", choices: ["mouses", "mice", "mices", "mouse"], answer: "mice" },
    { id: "q6", text: "Choose the correct preposition: She arrived ____ Monday.", choices: ["on", "in", "at", "by"], answer: "on" },
    { id: "q7", text: "Which is a countable noun?", choices: ["water", "rice", "apple", "sand"], answer: "apple" },
    { id: "q8", text: "Pick the comparative: 'small' → ____", choices: ["smaller", "smallest", "more small", "most small"], answer: "smaller" },
  ],
  A2: [
    { id: "q9", text: "Which sentence is correct?", choices: ["He don't like it.", "He doesn't like it.", "He didn't likes it.", "He not likes it."], answer: "He doesn't like it." },
    { id: "q10", text: "Choose the correct possessive: This is ____ book.", choices: ["I", "me", "my", "mine"], answer: "my" },
    { id: "q11", text: "Which is an adverb?", choices: ["happy", "quickly", "friend", "book"], answer: "quickly" },
    { id: "q12", text: "Select correct future: I ____ tomorrow.", choices: ["go", "went", "will go", "gone"], answer: "will go" },
    { id: "q13", text: "Which is a conjunction?", choices: ["and", "butter", "running", "above"], answer: "and" },
    { id: "q14", text: "Pick the correct infinitive: She wants ____.", choices: ["to eat", "eating", "ate", "eat"], answer: "to eat" },
    { id: "q15", text: "Choose antonym of 'difficult'.", choices: ["hard", "easy", "tough", "complex"], answer: "easy" },
    { id: "q16", text: "Which sentence asks a question?", choices: ["You are fine.", "Are you fine?", "You fine.", "You are fine!"], answer: "Are you fine?" },
  ],
  B1: [
    { id: "q17", text: "Select the correct plural: 'child' → ____", choices: ["childs", "children", "childes", "child"], answer: "children" },
    { id: "q18", text: "Pick the correct modal for obligation.", choices: ["can", "may", "must", "might"], answer: "must" },
    { id: "q19", text: "Which is a reflexive pronoun?", choices: ["himself", "they", "we", "she"], answer: "himself" },
    { id: "q20", text: "Choose the correct past participle of 'write'.", choices: ["writed", "written", "wrote", "writing"], answer: "written" },
    { id: "q21", text: "Which word is uncountable?", choices: ["apple", "information", "car", "chair"], answer: "information" },
    { id: "q22", text: "Pick the correct conditional: If I ____ you, I would go.", choices: ["am", "was", "were", "be"], answer: "were" },
    { id: "q23", text: "Which option is a punctuation mark?", choices: ["comma", "table", "window", "phone"], answer: "comma" },
    { id: "q24", text: "Choose the best connector for contrast.", choices: ["and", "so", "but", "because"], answer: "but" },
  ],
  B2: [
    { id: "q25", text: "Pick correct form: 'He ____ TV every night.'", choices: ["watch", "watches", "watched", "watching"], answer: "watches" },
    { id: "q26", text: "Which sentence uses passive voice?", choices: ["They baked a cake.", "A cake was baked.", "They will bake.", "Baking a cake."], answer: "A cake was baked." },
    { id: "q27", text: "Choose the correct homophone: 'They're' = ____", choices: ["there", "their", "they're", "they"], answer: "their" },
    { id: "q28", text: "Which word is a synonym of 'begin'?", choices: ["end", "start", "finish", "stop"], answer: "start" },
    { id: "q29", text: "Select the correct plural: 'analysis' → ____", choices: ["analysises", "analyses", "analysis", "analysi"], answer: "analyses" },
    { id: "q30", text: "Pick the correct comparative: 'good' → ____", choices: ["better", "best", "more good", "gooder"], answer: "better" },
    { id: "q31", text: "Which sentence is conditional?", choices: ["If it rains, we will stay.", "It rained yesterday.", "We stay now.", "Stay there."], answer: "If it rains, we will stay." },
    { id: "q32", text: "Choose the right pronoun: ____ gave me the book.", choices: ["Her", "She", "Hers", "They"], answer: "She" },
  ],
  C1: [
    { id: "q33", text: "Which is an interjection?", choices: ["Wow!", "Desk", "Running", "Quietly"], answer: "Wow!" },
    { id: "q34", text: "Pick the word with silent letter: 'knock' — silent ____", choices: ["k", "n", "c", "o"], answer: "k" },
    { id: "q35", text: "Choose correct tag question: 'You're coming, ____?'", choices: ["are you", "aren't you", "don't you", "isn't it"], answer: "aren't you" },
    { id: "q36", text: "Which is a past simple sentence?", choices: ["I eat", "I will eat", "I ate", "I am eating"], answer: "I ate" },
    { id: "q37", text: "Select the correct article: She is ____ honest person.", choices: ["a", "an", "the", "—"], answer: "an" },
    { id: "q38", text: "Which word is a verb?", choices: ["beautiful", "run", "happiness", "quickly"], answer: "run" },
    { id: "q39", text: "Pick the correct punctuation: Which ends a question?", choices: ["!", ".", "?", ","], answer: "?" },
    { id: "q40", text: "Choose the word that completes: He has been here ____ 2010.", choices: ["for", "since", "at", "in"], answer: "since" },
    { id: "q41", text: "Which tense: 'I have eaten' is ____", choices: ["present perfect", "past simple", "future", "past perfect"], answer: "present perfect" },
  ],
  C2: [
    { id: "q42", text: "Choose the correct preposition: She looked ____ the window.", choices: ["at", "in", "on", "to"], answer: "at" },
    { id: "q43", text: "Which word is antonym of 'avoid'?", choices: ["skip", "ignore", "seek", "evade"], answer: "seek" },
    { id: "q44", text: "Pick the correct plural of 'foot'.", choices: ["foots", "feet", "foot", "fots"], answer: "feet" },
    { id: "q45", text: "Which is an example of a gerund?", choices: ["to swim", "swimming", "swim", "swam"], answer: "swimming" },
    { id: "q46", text: "Choose correct form: I wish I ____ more time.", choices: ["have", "had", "will have", "has"], answer: "had" },
    { id: "q47", text: "Which word is a modal verb?", choices: ["should", "do", "walk", "table"], answer: "should" },
    { id: "q48", text: "Pick the correct spelling.", choices: ["accommodate", "acomodate", "accomodate", "acommodate"], answer: "accommodate" },
    { id: "q49", text: "Choose the correct collocation: 'make ____ decision'", choices: ["a", "the", "—", "an"], answer: "a" },
    { id: "q50", text: "Which is an example of passive infinitive?", choices: ["to be seen", "to see", "seeing", "seen"], answer: "to be seen" },
  ],
};


function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LEVEL_WEIGHTS: Record<string, number> = {
  // per-question weights — 5 questions per level => max total = 10.5
  A1: 0.1,
  A2: 0.2,
  B1: 0.3,
  B2: 0.4,
  C1: 0.5,
  C2: 0.6,
};

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
  const TOTAL = 30;

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const levels = Object.keys(FALLBACK_QUESTIONS_BY_LEVEL);
    const perLevel = 5;
    const finalSet: Question[] = [];

    for (const lvl of levels) {
      const pool = FALLBACK_QUESTIONS_BY_LEVEL[lvl] || [];
      finalSet.push(
        ...shuffle(pool)
          .slice(0, Math.min(perLevel, pool.length))
          .map((q) => ({ ...q, choices: shuffle(q.choices), level: lvl })) // attach level
      );
    }

    const selection = shuffle(finalSet).slice(0, Math.min(TOTAL, finalSet.length));
    if (!mounted) return;
    setQuestions(selection);
    setLoading(false);

    return () => {
      mounted = false;
    };
  }, []);

  const selectChoice = (qId: string, choice: string) => {
    if (reviewMode) return;
    setAnswers((s) => ({ ...s, [qId]: choice }));
  };

  const goNext = () => setCurrent((c) => Math.min(questions.length - 1, c + 1));
  const goPrev = () => setCurrent((c) => Math.max(0, c - 1));

  // calculate weighted scores by level and choose predicted CEFR level
  function calculateWeightedResult(questions: Question[], answers: Record<string, string>) {
    const levelScores: Record<
      string,
      { score: number; possible: number; percent: number }
    > = {};
    // init
    for (const lvl of Object.keys(FALLBACK_QUESTIONS_BY_LEVEL)) {
      levelScores[lvl] = { score: 0, possible: 0, percent: 0 };
    }

    // accumulate weighted scores
    let totalScore = 0;
    let totalPossible = 0;
    for (const q of questions) {
      const lvl = q.level ?? "A1";
      const weight = LEVEL_WEIGHTS[lvl] ?? 0;
      levelScores[lvl].possible += weight;
      totalPossible += weight;
      if (answers[q.id] === q.answer) {
        levelScores[lvl].score += weight;
        totalScore += weight;
      }
    }

    // compute percent per level
    for (const lvl of Object.keys(levelScores)) {
      const s = levelScores[lvl];
      s.percent = s.possible > 0 ? (s.score / s.possible) * 100 : 0;
    }

    // Map total weighted score to CEFR level:
    // Each 1.75 weight == 1 CEFR step. Levels array order: A1, A2, B1, B2, C1, C2
    const levels: EnglishLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const step = 1.75;
    const rawIndex = Math.floor(totalScore / step);
    const index = Math.max(0, Math.min(levels.length - 1, rawIndex));
    const predicted: EnglishLevel = levels[index];

    const weightedPercent = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
    return { levelScores, predicted, weightedPercent, totalScore, totalPossible };
  }

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) return;
    let correct = 0;
    for (const q of questions) if (answers[q.id] === q.answer) correct++;
    setScore(correct);

    // compute weighted CEFR result
    const { levelScores, predicted, weightedPercent, totalScore, totalPossible } = calculateWeightedResult(questions, answers);
    setPredictedLevel(predicted);
    setReviewMode(true);
    setCurrent(0);

    startTransition(() => {
      saveCefrResult(userId, predicted);
    });
  };

  const handleRetake = () => {
    setAnswers({});
    setReviewMode(false);
    setScore(null);
    setCurrent(0);
    setQuestions((qs) => shuffle(qs).map((q) => ({ ...q, choices: shuffle(q.choices) })));
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
            {/* show predicted CEFR level */}
            {predictedLevel && (
              <div className="mt-2 text-sm">
                Predicted CEFR level: <strong>{predictedLevel}</strong>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-sm text-slate-500">Progress</div>
            <div className="w-48 mt-2 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
              <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${Math.round(((current + 1) / questions.length) * 100)}%` }} />
            </div>
            <div className="text-xs text-slate-400 mt-2">{current + 1} / {questions.length}</div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <main className="lg:col-span-7">
            <article id={`q-${current}`} className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="text-sm text-slate-400">Question {current + 1}</div>
                <h3 className="text-lg font-medium mt-2">{qr.text}</h3>

                <div className="mt-4 flex items-center gap-3">
                  <div className={`text-sm font-semibold px-3 py-1 rounded-full ${userSel === qr.answer ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                    {userSel === qr.answer ? "Correct" : "Incorrect"}
                  </div>
                  <div className="text-sm text-slate-500">Correct: <span className="font-medium ml-1">{correctLetter} — {qr.answer}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                {qr.choices.map((choice, idx) => {
                  const isCorrect = choice === qr.answer;
                  const isUser = choice === userSel;
                  const bgClass = isCorrect ? "bg-emerald-50 border-emerald-400" : isUser ? "bg-red-50 border-red-300" : "bg-white border-slate-200 dark:bg-slate-800";
                  const textClass = isCorrect ? "text-emerald-800" : isUser ? "text-red-800" : "text-slate-700";
                  return (
                    <div key={idx} className={`p-4 rounded-lg border ${bgClass}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${isCorrect ? "bg-emerald-500 text-white" : isUser ? "bg-red-500 text-white" : "bg-slate-100 text-slate-700"}`}>{String.fromCharCode(65 + idx)}</div>
                        <div className={`${textClass}`}>{choice}</div>
                      </div>
                      {isCorrect && <div className="text-xs text-emerald-700 mt-2">Correct answer</div>}
                      {isUser && !isCorrect && <div className="text-xs text-red-700 mt-2">Your answer {userLetter ? `(${userLetter})` : ""}</div>}
                    </div>
                  );
                })}
              </div>

              <footer className="mt-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button onClick={goPrev} disabled={current === 0} className="px-4 py-2">
                    Previous
                  </Button>
                  <Button onClick={goNext} disabled={current === questions.length - 1} className="px-4 py-2">
                    Next
                  </Button>
                  <div className="text-sm text-slate-500 ml-4">{Object.keys(answers).length} / {questions.length} answered</div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={handleRetake} className="px-4 py-2">Retake</Button>
                  <Button onClick={handleFinish} className="px-4 py-2 bg-indigo-600 text-white">Finish</Button>
                </div>
              </footer>
            </article>
          </main>

          <aside className="lg:col-span-5 sticky top-24 h-fit">
            <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm">
              <div className="text-sm text-slate-500 mb-3">Questions</div>

              <div className="space-y-2 max-h-[50vh] overflow-auto pr-2">
                {questions.map((q, i) => {
                  const user = answers[q.id];
                  const correct = user === q.answer;
                  return (
                    <button key={q.id} onClick={() => setCurrent(i)} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${i === current ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                      <div className={`w-10 h-10 flex items-center justify-center rounded-full font-semibold ${correct ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>{i + 1}</div>
                      <div className="flex-1 text-sm">
                        <div className="truncate">{`${q.id}: ${q.answer}`}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{correct ? "Correct" : "Incorrect"}</div>
                      </div>
                    </button>
                  );
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
            <div className="text-sm text-slate-500">Progress</div>
            <div className="w-48 mt-2 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
              <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${Math.round(((current + 1) / questions.length) * 100)}%` }} />
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
                <button key={idx} onClick={() => selectChoice(q.id, choice)} aria-pressed={selected}
                  className={`text-left p-5 rounded-xl border transition-shadow duration-150 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 ${selected ? "bg-blue-50 border-blue-400 shadow-md dark:bg-blue-900/30" : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700"}`}>
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
              <Button onClick={goPrev} disabled={current === 0} className="px-4 py-2">
                Previous
              </Button>
              <Button onClick={goNext} disabled={current === questions.length - 1} className="px-4 py-2">
                Next
              </Button>
              <div className="text-sm text-slate-500 ml-4">{Object.keys(answers).length} / {questions.length} answered</div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSubmit} disabled={Object.keys(answers).length < questions.length} className="px-6 py-3 bg-green-600 text-white rounded-lg disabled:opacity-50">
                Submit Test
              </Button>
            </div>
          </footer>
        </main>

        <div className="mt-6 text-center text-sm text-slate-500">
          Take your time — your results will be saved and available to review after submission.
        </div>
      </div>
    </div>
  );
}