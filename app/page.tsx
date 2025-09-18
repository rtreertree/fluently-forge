"use client";

import { Button } from "@/components/ui/button";
import { Anvil, BookOpen, Mic, Headphones } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
    const router = useRouter();
    const [featureIdx, setFeatureIdx] = useState(0);

    const features = [
        { title: "Small Talk", body: "Short conversational sessions to practice everyday English.", Icon: Mic, badge: "Popular" },
        { title: "Scenario Creator", body: "Build custom scenarios to practice role-play and situation-based speaking.", Icon: BookOpen },
        { title: "Video-Call Practice", body: "Simulated video-call style conversations for real-life fluency.", Icon: Headphones, badge: "New" },
        { title: "Monologue / Public Speaking", body: "Prompts and timed practice to improve storytelling and flow.", Icon: Anvil },
        { title: "Listening Diagnostic", body: "Short listening tests with feedback and scoring.", Icon: Headphones },
        { title: "Pronunciation & Intonation", body: "Post-session suggestions and intonation feedback.", Icon: Mic, badge: "Recommended" },
        { title: "Vocabulary Suggestions", body: "AI-driven alternative phrasing and word choice hints.", Icon: BookOpen },
    ];

    const prevFeature = () => setFeatureIdx(i => (i - 1 + features.length) % features.length);
    const nextFeature = () => setFeatureIdx(i => (i + 1) % features.length);

    return (
        <div className="min-h-screen flex flex-col bg-gray-100 text-black">
             {/* Header */}
             <header className="w-full flex items-center justify-between px-6 py-4 rounded-lg border-b border-gray-200 bg-white/95 backdrop-blur fixed top-0 left-0 z-50 shadow-md">
                 <div className="flex items-center gap-2">
                     <span className="text-2xl font-extrabold text-black tracking-tight">English Learning AI</span>
                 </div>
             </header>

             {/* Main Content */}
            <main className="flex-1 flex flex-col items-center px-4 pt-28 pb-12 relative">
                {/* DIAGONAL TEXTURE (furthest back) - softened for light background */}

                {/* Extra left-side badges + subtle timeline (top layer among decorations) */}
                <div className="hidden xl:flex pointer-events-none absolute left-10 top-24 lg:top-28 z-0 flex-col items-start gap-6">
                    <div className="flex items-center gap-3 -rotate-6">
                        <div className="w-2 h-12 bg-black/5 rounded-full" />
                        <div className="bg-white/90 border border-black/6 px-3 py-2 rounded-xl shadow-sm text-sm">
                            <strong className="block text-black">Daily Streak</strong>
                            <span className="text-xs text-gray-600">Keep momentum</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rotate-3">
                        <div className="w-2 h-12 bg-gradient-to-b from-black/6 to-transparent rounded-full" />
                        <div className="bg-white/85 border border-black/6 px-3 py-2 rounded-xl shadow-sm text-sm">
                            <strong className="block text-black">Pronunciation Tips</strong>
                            <span className="text-xs text-gray-600">Short, targeted advice</span>
                        </div>
                    </div>
                </div>

                {/* Extra right-side badges + sparkles (top layer among decorations, show only on very wide screens) */}
                <div className="hidden 2xl:flex pointer-events-none absolute right-10 top-1/3 z-0 flex-col items-end gap-6">
                    <div className="flex items-center gap-3 -rotate-3">
                        <div className="bg-white/90 border border-black/6 px-3 py-2 rounded-xl shadow-sm text-sm text-right">
                            <strong className="block text-black">Custom Modules</strong>
                            <span className="text-xs text-gray-600">Pick topics you want</span>
                        </div>
                        <div className="w-2 h-12 bg-gradient-to-t from-black/6 to-transparent rounded-full" />
                    </div>
                    <div className="flex items-center gap-3 rotate-6">
                        <div className="bg-white/85 border border-black/6 px-3 py-2 rounded-xl shadow-sm text-sm text-right">
                            <strong className="block text-black">Progress Badges</strong>
                            <span className="text-xs text-gray-600">Visual milestones</span>
                        </div>
                        <div className="w-2 h-12 bg-black/5 rounded-full" />
                    </div>
                </div>

                {/* Hero Section */}
                <section className="flex flex-col items-center py-20 relative w-full max-w-4xl text-center">
                    <div className="absolute -z-10 w-72 h-72 rounded-full bg-gradient-to-br from-black/10 via-black/5 to-transparent blur-2xl opacity-30" />
                    <Anvil size={120} className="text-black mx-auto" />
                    <h1 className="text-5xl font-extrabold mb-6 text-black">
                        Start learning English like a pro with AI
                    </h1>
                    <p className="max-w-2xl text-gray-700 mb-8 text-lg">
                        Adaptive lessons, real-time feedback, and practice scenarios designed to match your level and goals.
                    </p>
                    <Button 
                        onClick={() => router.push("/auth/login")} 
                        className="px-8 py-4 rounded-full bg-black text-white font-bold hover:bg-black/80 transition text-lg"
                    >
                        Get Started For Free
                    </Button>
                </section>

                {/* Features Grid (visual overview) */}
                <section className="w-full max-w-5xl py-16">
                    <h2 className="text-3xl font-bold text-center mb-10">Why learn English with AI?</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="group relative p-6 rounded-2xl border shadow hover:shadow-lg transition-transform transform hover:-translate-y-2 hover:scale-102">
                           <Mic className="w-10 h-10 mb-4 text-black group-hover:scale-110 transition-transform" />
                           <h3 className="text-xl font-bold mb-2">Speaking Confidence</h3>
                           <p className="text-gray-700">Practice conversations anytime with AI that corrects mistakes instantly.</p>
                           <span className="absolute top-3 right-3 text-xs bg-black text-white px-2 py-1 rounded-full">Popular</span>
                       </div>
                       <div className="group relative p-6 rounded-2xl border shadow hover:shadow-lg transition-transform transform hover:-translate-y-2 hover:scale-102">
                           <Headphones className="w-10 h-10 mb-4 text-black group-hover:scale-110 transition-transform" />
                           <h3 className="text-xl font-bold mb-2">Better Listening</h3>
                           <p className="text-gray-700">Improve comprehension with quick listening diagnostics and feedback.</p>
                           <span className="absolute top-3 right-3 text-xs bg-black text-white px-2 py-1 rounded-full">New</span>
                       </div>
                       <div className="group relative p-6 rounded-2xl border shadow hover:shadow-lg transition-transform transform hover:-translate-y-2 hover:scale-102">
                           <BookOpen className="w-10 h-10 mb-4 text-black group-hover:scale-110 transition-transform" />
                           <h3 className="text-xl font-bold mb-2">Smart Vocabulary</h3>
                           <p className="text-gray-700">Get suggestions for natural word choices and alternative phrasing.</p>
                           <span className="absolute top-3 right-3 text-xs bg-black text-white px-2 py-1 rounded-full">Recommended</span>
                       </div>
                   </div>
               </section>

                {/* Interactive Carousel */}
                <section className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-8 mb-16 border border-gray-200">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Feature List */}
                        <div className="flex-1 bg-black text-white rounded-2xl p-6 border border-gray-800">
                            <h2 className="text-2xl font-bold mb-4">Core features</h2>
                            <ul className="space-y-2 text-base text-gray-200">
                                {features.map((f, i) => {
                                    const Icon = f.Icon;
                                    const active = i === featureIdx;
                                    return (
                                        <li key={i}>
                                            <button
                                                onClick={() => setFeatureIdx(i)}
                                                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition transform ${
                                                    active
                                                        ? "bg-white/6 ring-1 ring-black/10 scale-102"
                                                        : "hover:bg-white/2"
                                                }`}
                                                aria-pressed={active}
                                            >
                                                <span className={`relative inline-flex items-center justify-center`}>
                                                    <Icon className={`w-5 h-5 ${active ? "text-white" : "text-gray-200"}`} />
                                                    {active && (
                                                        <span className="absolute -inset-1 rounded-full border border-white/10 animate-ping opacity-40" />
                                                    )}
                                                </span>
                                                <span className="leading-tight flex-1">{f.title}</span>
                                                {f.badge && (
                                                    <span className="ml-2 inline-block text-xs bg-white/10 text-white px-2 py-0.5 rounded-full">
                                                        {f.badge}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {/* Feature Carousel */}
                        <div className="flex-1 bg-white text-black rounded-2xl p-6 border border-gray-200 relative">
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <button onClick={prevFeature} className="w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" /></svg>
                                </button>
                                <button onClick={nextFeature} className="w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /></svg>
                                </button>
                            </div>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={featureIdx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    {/* show feature icon above title with subtle pulsing ring when active */}
                                    <div className="relative inline-flex mb-3">
                                        {(() => {
                                            const ActiveIcon = features[featureIdx].Icon;
                                            return <ActiveIcon className="w-8 h-8 text-black" />;
                                        })()}
                                        <span className="absolute -inset-1 rounded-full border border-black/10 animate-ping opacity-30" />
                                    </div>
                                     <h2 className="text-2xl font-bold mb-3">{features[featureIdx].title}</h2>
                                     <p className="text-base text-gray-900 mb-4">{features[featureIdx].body}</p>
                                 </motion.div>
                             </AnimatePresence>
                        </div>
                    </div>
                </section>

                {/* How it Works */}
                <section className="w-full max-w-5xl py-16">
                    <h2 className="text-3xl font-bold text-center mb-10">How it works</h2>
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div className="p-6 rounded-2xl border shadow">
                            <h3 className="text-xl font-bold mb-2">1. Quick Test</h3>
                            <p className="text-gray-700">Start with a short placement test to find your English level.</p>
                        </div>
                        <div className="p-6 rounded-2xl border shadow">
                            <h3 className="text-xl font-bold mb-2">2. Manual Plan</h3>
                            <p className="text-gray-700">Create a manual study plan you control — choose goals, pace, and modules to match your needs.</p>
                        </div>
                        <div className="p-6 rounded-2xl border shadow">
                            <h3 className="text-xl font-bold mb-2">3. Daily Practice</h3>
                            <p className="text-gray-700">Practice speaking, listening, and vocabulary every day.</p>
                        </div>
                    </div>
                </section>

                {/* Closing CTA */}
                <section className="w-full py-20 text-center bg-black text-white rounded-2xl shadow-lg mb-16">
                    <h2 className="text-3xl font-bold mb-4">Ready to start speaking confidently?</h2>
                    <Button 
                        onClick={() => router.push("/auth/login")} 
                        className="px-8 py-3 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition"
                    >
                        Join Now – It’s Free
                    </Button>
                </section>
             </main>
 
             {/* Footer */}
             <footer className="bg-white border-t border-gray-200 py-6 text-center text-gray-600 text-sm">
                 © 2025 English Learning AI · Built by RT, Kla, Poon · MS.6 / EAI
             </footer>
        </div>
     );
}
