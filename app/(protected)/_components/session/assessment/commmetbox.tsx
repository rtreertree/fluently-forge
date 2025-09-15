'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'

interface comment {
    original: string,
    improved: string,
    reason: string
}

interface CommentBoxProps {
    comments: comment[],
    scores: {
        Accuracy: number,
        Fluency: number,
        Prosody: number,
        PronScore: number
    }
}

export default function CommentBox({ comments, scores }: CommentBoxProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null)


    // helper function for score color
    const getColor = (score: number) => {
        if (score >= 80) return "bg-green-500"
        if (score >= 60) return "bg-yellow-500"
        return "bg-red-500"
    }

    console.log("Scores:", scores);

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
                <h2 className="text-lg font-semibold mb-2">Recommendations</h2>
                <ul className="space-y-3">
                    {comments.map((c, idx) => (
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