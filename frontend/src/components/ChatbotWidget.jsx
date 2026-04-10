import { useMemo, useState } from 'react'

const AssistantSparkIcon = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 3.2a4 4 0 013.94 3.2h2.06a3.2 3.2 0 110 6.4h-.5a4 4 0 01-6.78 2.82l-1.47.85a3.2 3.2 0 11-3.2-5.54l-.01-1.7A4 4 0 0112 3.2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.6 6.4A4 4 0 016.2 13l1.01 1.76a3.2 3.2 0 105.54-3.2l1.47-.85A4 4 0 0012 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15.4 17.6A4 4 0 0112 20.8a4 4 0 01-3.94-3.2H6a3.2 3.2 0 110-6.4h.5a4 4 0 016.78-2.82l1.47-.85a3.2 3.2 0 113.2 5.54l.01 1.7a4 4 0 01-2.56 3.83z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export default function ChatbotWidget() {
    const [open, setOpen] = useState(false)
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hi, I can help you find mentors and career guidance.'
        }
    ])

    const apiBase = useMemo(() => (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, ''), [])

    const sendMessage = async () => {
        const question = input.trim()
        if (!question || loading) return

        const userMessage = { role: 'user', content: question }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)

        try {
            const response = await fetch(`${apiBase}/chatbot/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question })
            })

            const result = await response.json()
            const answer = result?.data?.answer || result?.answer || result?.message || 'Unable to reply right now.'

            setMessages(prev => [...prev, { role: 'assistant', content: answer }])
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {open && (
                <div className="fixed bottom-24 right-4 sm:right-6 z-[70] w-[calc(100vw-2rem)] sm:w-96 h-[28rem] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="h-14 px-4 flex items-center justify-between bg-blue-600 text-white">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                                <AssistantSparkIcon className="w-5 h-5 text-white" />
                            </div>
                            <p className="font-semibold">CareerBridge AI</p>
                        </div>
                        <button onClick={() => setOpen(false)} className="text-white/90 hover:text-white text-xl leading-none">x</button>
                    </div>

                    <div className="h-[calc(100%-7.5rem)] overflow-y-auto p-3 space-y-2 bg-blue-50/40">
                        {messages.map((message, index) => (
                            <div
                                key={`${message.role}-${index}`}
                                className={`max-w-[88%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${message.role === 'user' ? 'ml-auto bg-blue-600 text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'}`}
                            >
                                {message.content}
                            </div>
                        ))}
                        {loading && (
                            <div className="max-w-[88%] px-3 py-2 rounded-2xl rounded-bl-md text-sm bg-white border border-gray-200 text-gray-500">
                                Thinking...
                            </div>
                        )}
                    </div>

                    <div className="h-16 p-2 border-t border-gray-200 flex items-center gap-2 bg-white">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') sendMessage()
                            }}
                            placeholder="Ask anything..."
                            className="flex-1 h-11 px-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            className="h-11 px-4 rounded-xl bg-blue-600 text-white disabled:opacity-50"
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={() => setOpen(prev => !prev)}
                className="fixed bottom-6 right-4 sm:right-6 z-[80] w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 flex items-center justify-center"
                aria-label="Open chatbot"
            >
                <AssistantSparkIcon className="w-7 h-7" />
            </button>
        </>
    )
}
