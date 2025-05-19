import { Card, CardHeader } from "@/components/ui/card";


interface MonologueQuestionCardProps {
    question: string;
    prompts: string[];
}

const MonologueQuestionCard = ({ question, prompts }: MonologueQuestionCardProps) => {
    return (

        <Card className="w-full p-4 mt-4 shadow-lg m-0">
            <CardHeader className="text-center m-0">
                <h1 className="text-lg font-semibold">{question}</h1>
            </CardHeader>
            <h2 className="text-left">You might say:</h2>
            <ul className="list-disc list-inside">
                {prompts.map((prompt, index) => (
                    <li key={index} className="text-gray-700 text-left">
                        {prompt}
                    </li>
                ))}
            </ul>
        </Card>
    )
};

export default MonologueQuestionCard;