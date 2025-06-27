'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MergedTranscription } from '@/actions/azureHandler'

interface ChatBoxProp {
    messages: MergedTranscription[]
}

export default function SupportChat({messages}: ChatBoxProp) {

    const messagesEndRef = useRef<HTMLDivElement>(null)


    return (
        <Card className="w-[500px] h-[700px] shadow-lg rounded-lg flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${msg.speaker === 1
                                ? 'bg-neutral-800 text-white self-start'
                                : 'bg-gray-100 text-black self-end ml-auto'
                            }`}
                    >
                        {msg.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        </Card>
    )
}