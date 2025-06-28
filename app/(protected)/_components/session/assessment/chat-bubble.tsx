import { ChatWord } from "./chat-word";


interface ChatBubbleProps {
    message: string;
    isUser: boolean;
    idx: number;
}


export const ChatBubble = ({ message, isUser, idx }: ChatBubbleProps) => {

    // Ensure message is not empty
    if (!message.trim()) {
        return null;
    }

    // separate text into words;
    const words = message.split(' ');

    return (
        <div
            key={idx}
            className={`w-fit max-w-[80%] px-4 py-2 rounded-xl text-m ${isUser
                ? 'bg-neutral-800 text-white self-start'
                : 'bg-gray-100 text-black self-end ml-auto'
                }`}
        >
            <div className="flex flex-wrap">
                {words.map((word, wordIdx) => (
                    ChatWord({ word, idx: wordIdx, underline: !isUser })
                ))}
            </div>
        </div>
    );
}