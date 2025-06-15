'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Message = {
    sender: 'user' | 'agent'
    text: string
}

export default function SupportChat() {
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'agent', text: 'Hi, how can I help you today?' },
        { sender: 'user', text: "Hey, I'm having trouble with my account." },
        { sender: 'agent', text: 'What seems to be the problem?' },
        { sender: 'user', text: "I can't log in." },
    ])
    const [input, setInput] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const sendMessage = () => {
        if (!input.trim()) return
        setMessages([...messages, { sender: 'user', text: input.trim() }])
        setInput('')
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    return (
        <Card className="w-full h-screen bg-black text-white flex flex-col border-none rounded-none">
            {/* Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black font-bold">
                    S
                </div>
                <div>
                    <div className="text-sm font-semibold">Sofia Davis</div>
                    <div className="text-xs text-gray-400">m@example.com</div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${msg.sender === 'agent'
                                ? 'bg-neutral-800 text-white self-start'
                                : 'bg-gray-100 text-black self-end ml-auto'
                            }`}
                    >
                        {msg.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
                className="p-4 border-t border-neutral-800 flex space-x-2"
                onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                }}
            >
                <Input
                    className="flex-1 bg-neutral-900 text-white border-neutral-700"
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <Button type="submit" variant="secondary" className="bg-neutral-700">
                    ➤
                </Button>
            </form>
        </Card>
    )
}