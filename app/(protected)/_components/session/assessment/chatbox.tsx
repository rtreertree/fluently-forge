'use client'

import { useRef } from 'react'
import { Card } from '@/components/ui/card'
import { MergedTranscription } from '@/actions/azureHandler'

/* ---------- Types ---------- */
interface ChatBoxProps {
    messages: MergedTranscription[]
}

interface ChatWordProps {
    word: string
    underline?: boolean
}

interface ChatBubbleProps {
    message: string
    isUser: boolean
}

/* ---------- Components ---------- */
const ChatWord = ({ word, underline = false }: ChatWordProps) => (
    <span className={`inline-block px-[3px] ${underline ? 'underline' : ''}`}>
        {word}
    </span>
)

const ChatBubble = ({ message, isUser }: ChatBubbleProps) => {
    if (!message.trim()) return null

    const words = message.split(/\s+/)

    return (
        <div
            className={`w-fit max-w-[80%] px-4 py-2 rounded-xl text-base ${isUser
                    ? 'bg-neutral-800 text-white self-start'
                    : 'bg-gray-100 text-black self-end ml-auto'
                }`}
        >
            <div className="flex flex-wrap">
                {words.map((word, idx) => (
                    <ChatWord key={idx} word={word} />
                ))}
            </div>
        </div>
    )
}

/* ---------- Main ---------- */
export default function TranscriptionChat({ messages }: ChatBoxProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null)

    return (
        <Card className="w-[500px] h-[700px] shadow-lg rounded-lg flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900">
                {messages.map((msg, idx) => (
                    <ChatBubble
                        key={idx}
                        message={msg.text}
                        isUser={msg.speaker === 1}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>
        </Card>
    )
}