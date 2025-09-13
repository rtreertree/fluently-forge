'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'

interface comment {
    original: string,
    improved: string,
    reason: string
}

export default function CommentBox() {
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // 10 placeholder comments
    const [comment, setComment] = useState<comment[]>([
        { original: "I goes to school.", improved: "I go to school.", reason: "Subject-verb agreement correction." },
        { original: "She have a book.", improved: "She has a book.", reason: "Verb form correction." },
        { original: "I am interesting in math.", improved: "I am interested in math.", reason: "Use past participle for adjectives." },
        { original: "He speak English well.", improved: "He speaks English well.", reason: "Verb conjugation for third person singular." },
        { original: "They is playing outside.", improved: "They are playing outside.", reason: "Correct verb form for plural subject." },
        { original: "It raining today.", improved: "It is raining today.", reason: "Missing auxiliary verb." },
        { original: "She can sings.", improved: "She can sing.", reason: "Modal verbs use base form." },
        { original: "We was happy.", improved: "We were happy.", reason: "Correct past tense for plural subject." },
        { original: "I didn’t went there.", improved: "I didn’t go there.", reason: "After 'did', use base verb." },
        { original: "This are my friends.", improved: "These are my friends.", reason: "Correct demonstrative with plural noun." },
    ])

    // placeholder for scores
    const scores = {
        AccuracyScore: 85,
        FluencyScore: 78,
        ProsodyScore: 62,
        PronScore: 81
    }

    // helper function for score color
    const getColor = (score: number) => {
        if (score >= 80) return "bg-green-500"
        if (score >= 60) return "bg-yellow-500"
        return "bg-red-500"
    }

    return (
        <Card className="w-[500px] h-[700px] shadow-lg rounded-lg flex flex-col p-4 gap-4">
            
            {/* Pronunciation Scores */}
            <div className="border-b pb-4">
                <h2 className="text-lg font-semibold mb-2">Pronunciation Scores</h2>
                <div className="space-y-3 text-sm">
                    {Object.entries(scores).map(([label, value], idx) => (
                        <div key={idx}>
                            <div className="flex justify-between mb-1">
                                <span>{label.replace("Score", "")}:</span>
                                <span>{value}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-2 ${getColor(value)} transition-all duration-700 ease-out`}
                                    style={{ width: `${value}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Text Recommendations */}
            <div className="flex-1 overflow-y-auto">
                <h2 className="text-lg font-semibold mb-2">Text Recommendations</h2>
                <ul className="space-y-3">
                    {comment.map((c, idx) => (
                        <li key={idx} className="p-2 border rounded-lg text-sm">
                            <p><strong>Original:</strong> {c.original}</p>
                            <p><strong>Improved:</strong> {c.improved}</p>
                            <p className="text-gray-600"><em>Reason:</em> {c.reason}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </Card>
    )
}