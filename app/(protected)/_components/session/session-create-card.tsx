import { isUserInSession } from "@/actions/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionType } from "@prisma/client";
import { useSession } from "next-auth/react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import SmallTalkForm from "./create/smalltalk-form";
import MonologueForm from "./create/monologue-form";
import ScenarioForm from "./create/scenario-form";

interface SessionCreateCardProps {
    type: SessionType;
}

const items = [
    { name: "Small Talk", description: "Practice your English speaking skills with our AI-powered conversation partner.", link: "/session/create/small-talk", type: SessionType.SMALLTALK },
    { name: "Scenario Creation", description: "Create scenarios to practice your English in real-world situations.", link: "/session/create/scenario-creation", type: SessionType.SCENARIO_CREATION },
    { name: "Dictionary", description: "Learn new words and expand your vocabulary.", link: "/session/create/dictionary", type: SessionType.DICTIONARY },
    { name: "Monologue", description: "Improve your speaking skills with guided idea and bullet points.", link: "/session/create/public-speaking", type: SessionType.MONOLOGUE },
];

const SessionCreateCard: React.FC<SessionCreateCardProps> = ({ type }: SessionCreateCardProps) => {
    const session = useSession();
    const sessionDescription = items.find((item) => item.type === type) as { name: string; description: string; link: string; type: SessionType };


    return (
        <>
            <Dialog>
                <DialogContent className="sm:max-w-[420px] p-10">
                    <DialogHeader>
                        <DialogTitle>{sessionDescription.name}</DialogTitle>
                        <DialogDescription>
                            {sessionDescription.description}
                        </DialogDescription>
                    </DialogHeader>
                    {sessionDescription.type === SessionType.MONOLOGUE && (<MonologueForm />)}
                    {sessionDescription.type === SessionType.SMALLTALK && (<SmallTalkForm />)}
                    {sessionDescription.type === SessionType.DICTIONARY && (<p> NOT IMPLEMENT</p>)}
                    {sessionDescription.type === SessionType.SCENARIO_CREATION && (<ScenarioForm />)}
                </DialogContent>

                <Card className="w-[300px] h-[400px] shadow-lg rounded-lg flex flex-col">
                    <CardHeader className="flex flex-col items-center justify-center">
                        <CardTitle className="text-center text-2xl font-bold my-2">
                            {sessionDescription.name}
                        </CardTitle>
                        <hr className="w-full border-t border-gray-300" />
                    </CardHeader>

                    <CardContent className="flex flex-col items-center justify-center flex-grow">
                        <p className="text-center text-gray-600 mb-4">
                            {sessionDescription.description}
                        </p>
                    </CardContent>
                    <CardFooter className="flex justify-center items-center p-4">
                        <DialogTrigger asChild>
                            <Button className="w-full">
                                Start a Session
                            </Button>
                        </DialogTrigger>
                    </CardFooter>
                </Card>
            </Dialog>
        </>
    );
};


export default SessionCreateCard;