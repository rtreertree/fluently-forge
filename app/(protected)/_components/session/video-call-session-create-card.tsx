import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { isUserInSession } from "@/actions/session";

const VIDEO_CALL_ITEM = {
    name: "Video Call",
    description: "Practice speaking English confidently in real-time with a friendly tutor through 1-on-1 live video calls.",
    link: "/video-call/create",
};

const VideoCallSessionCreateCard: React.FC = () => {
    const session = useSession();
    const router = useRouter();

    const handleStart = async () => {
        const isSessionExists = await isUserInSession(session.data?.user.id as string);
        if (isSessionExists) {
            alert("You already have an active session. Please end it before starting a new one.");
            return;
        }
        router.push(VIDEO_CALL_ITEM.link);
    };

    return (
        <Card className="w-[300px] h-[400px] shadow-lg rounded-lg flex flex-col">
            <CardHeader className="flex flex-col items-center justify-center">
                <CardTitle className="text-center text-2xl font-bold my-2">
                    {VIDEO_CALL_ITEM.name}
                </CardTitle>
                <hr className="w-full border-t border-gray-300" />
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center flex-grow">
                <p className="text-center text-gray-600 mb-4">
                    {VIDEO_CALL_ITEM.description}
                </p>
            </CardContent>
            <CardFooter className="flex justify-center items-center p-4">
                <Button className="w-full" onClick={handleStart}>
                    Start a Session
                </Button>
            </CardFooter>
        </Card>
    );
};

export default VideoCallSessionCreateCard;