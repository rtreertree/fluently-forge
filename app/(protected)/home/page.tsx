import React from "react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-gray-100 to-gray-200 relative">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur fixed top-0 left-10 z-1 shadow-md pointer-events-auto">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 drop-shadow" />
          <span className="text-2xl font-extrabold text-black tracking-tight">English Learning AI</span>
        </div>
      </header>

      {/* Main Content (scrollable) */}
      <main className="flex-1 flex flex-col items-center px-4 pt-28 pb-20 overflow-y-auto">
        {/* Hero Section */}
        <section className="flex flex-col items-center py-10">
          <img src="/logo.png" alt="Logo" className="w-28 h-28 mb-4 drop-shadow-lg" />
          <h1 className="text-4xl font-extrabold text-center mb-4 text-black drop-shadow">
            Start learning English like a pro with an AI that adapts to your needs!
          </h1>
          <div className="flex gap-4 mb-8">
            <button className="px-8 py-3 bg-gradient-to-r from-black to-gray-700 text-white rounded-lg shadow-lg hover:scale-105 hover:from-gray-900 hover:to-black transition-all font-bold text-lg border border-gray-700">
              Sign Up
            </button>
            <button className="px-8 py-3 bg-white border border-gray-400 text-black rounded-lg shadow hover:bg-gray-100 hover:scale-105 transition-all font-bold text-lg">
              Log In
            </button>
          </div>
        </section>

        <section className="w-full max-w-2xl bg-white/80 rounded-2xl shadow-xl p-10 mb-8 border border-gray-200">
          <h2 className="text-3xl font-bold mb-3 text-black">Talk with AI – Make English Fun!</h2>
          <p className="mb-5 text-gray-700">
            An application for learning English through interactive dialogues with AI. After each session, you’ll receive detailed scores and personalized feedback to make language learning more fun and effective.
          </p>
          <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-800">Session Type</h3>
          <ul className="list-disc list-inside mb-5 text-gray-700 space-y-1">
            <li><b>Small Talk:</b> Casual English speaking practice through short conversations.</li>
            <li><b>Talk:</b> Focuses on fun and fluent communication.</li>
            <li><b>Public Speaking:</b> Practice speaking with a focus on storytelling flow. Each day, you’ll get one new random topic to talk about.</li>
          </ul>
          <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-800">Features</h3>
          <ul className="list-disc list-inside mb-5 text-gray-700 space-y-1">
            <li><b>Daily notification:</b> The application will send notifications to prompt users to start lessons, affirming continuity in their learning.</li>
            <li><b>Pronunciation suggestion:</b> After each conversation, all dialogs will be processed by the GPT-AI model, which accurately identifies alternative sentences to help expand your vocabulary and fluency.</li>
            <li><b>Intonation analysis:</b> Voice analysis for pronunciation feedback, with suggestions through pronunciation lessons.</li>
            <li><b>Vocabulary choice:</b> Choosing the right words is crucial, which is why an AI model is fine-tuned to help users find the most suitable or fun phrasing, expanding their vocabulary.</li>
            <li><b>Suggestion mode:</b> Real-time suggestions can be enabled for new users who are just starting to learn English.</li>
            <li><b>Point and leveling:</b> After each session, users will receive points as rewards, which can be used to unlock new features and levels.</li>
            <li><b>Real-time communication:</b> Using the GPT-AI model, media is analyzed speech and engages in natural, real-time interactions.</li>
            <li><b>Scenario builder:</b> Users can prepare specific situations with the app to practice and upload related documents to help generate customized speaking scenarios.</li>
          </ul>
          <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-800">Level up</h3>
          <p className="mb-5 text-gray-700">
            This system helps make learning more enjoyable by allowing users to progress through levels, creating a sense of achievement. It also ensures that the vocabulary in each conversation matches the user’s current level, so learners never feel overwhelmed.
          </p>
          <div className="levels grid gap-3">
            <div className="bg-black/80 border-l-4 border-black rounded px-4 py-2 font-semibold shadow-sm text-white">Ancient Oak: Advanced Language Master with Cultural Proficiency</div>
            <div className="bg-black/60 border-l-4 border-gray-700 rounded px-4 py-2 font-semibold shadow-sm text-white">Tree: Upper-Intermediate Communicator of Complex Ideas</div>
            <div className="bg-black/40 border-l-4 border-gray-500 rounded px-4 py-2 font-semibold shadow-sm text-white">Sapling: Confident Conversational Speaker with Expanding Fluency</div>
            <div className="bg-black/20 border-l-4 border-gray-400 rounded px-4 py-2 font-semibold shadow-sm text-black">Sprout: Elementary User of Simple Vocabulary and Grammar</div>
            <div className="bg-white border-l-4 border-gray-300 rounded px-4 py-2 font-semibold shadow-sm text-black">Seed: Beginner with Basic Communication Skills</div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white/95 border-t border-gray-200 py-4 text-center text-gray-600 text-sm fixed bottom-0 left-0 w-full z-1 backdrop-blur shadow-md pointer-events-auto">
        by rtee, kla, poon &nbsp; ms.5 / EAI
      </footer>
    </div>
  );
}