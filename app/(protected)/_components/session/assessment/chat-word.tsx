
interface ChatWordProps {
    word: string;
    idx: number;
    underline: boolean;
}

export const ChatWord = ({word, idx, underline}: ChatWordProps) => {
    return (
        <span
            key={idx}
            className={`inline-block px-[3px] ${underline ? 'underline' : ''}`}
        >
            {word}
        </span>
    );
}