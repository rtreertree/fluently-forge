import { createSession } from "@/actions/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "next-auth/react";


interface SessionCreateCardProps {
    itemIndex: number; // Accept the index of the item as a prop
}
const SessionCreateCard: React.FC<SessionCreateCardProps> = ({ itemIndex })=> {
    const session = useSession();
    const handleStartSession = async () => {
        const id = await  createSession(session.data?.user.id as string, "alloy");
        window.location.href = `/session/active/?id=${id}`;

    };

    return (
        <Card className="w-[300px] h-[400px] shadow-lg rounded-lg flex flex-col">
            <CardHeader className="flex flex-col items-center justify-center">
                <CardTitle className="text-center text-2xl font-bold my-2">
                 {items[itemIndex].name}
                </CardTitle>
                <hr className="w-full border-t border-gray-300" />
            </CardHeader>

            <CardContent className="flex flex-col items-center justify-center flex-grow">
                <p className="text-center text-gray-600 mb-4">
                {items[itemIndex].description}
                </p>
            </CardContent>

            <CardFooter className="flex justify-center items-center p-4">
                <Button className="w-full" onClick={handleStartSession}>
                    Start a Session
                </Button>
            </CardFooter>
        </Card>
    );
};
const items = [
    {  name: "Small Talk", description: "Practice your English speaking skills with our AI-powered conversation partner." },
    {  name: "Sennario Creation", description: "Create scenarios to practice your English in real-world situations." },
    { name: "Dictionary", description: "Learn new words and expand your vocabulary." },
    {  name: "Public Speaking", description: "Improve your public speaking skills with guided practice." },
];

export default SessionCreateCard;