'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MergedTranscription } from '@/actions/azureHandler'
import { ChatBubble } from './chat-bubble'

interface ChatBoxProp {
    messages: MergedTranscription[]
}

export default function SupportChat({messages}: ChatBoxProp) {

    const messagesEndRef = useRef<HTMLDivElement>(null)

    return (
        <Card className="w-[500px] h-[700px] shadow-lg rounded-lg flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900">
                {messages.map((msg, idx) => (
                    <ChatBubble
                        key={idx}
                        message={msg.text}
                        isUser={msg.speaker === 1}
                        idx={idx}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>
        </Card>
    )
}