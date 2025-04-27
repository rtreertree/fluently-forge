import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const SessionCreateCard: React.FC = () => {
    return (
        <Card className="w-[300px] h-[400px] bg-white shadow-lg rounded-lg flex flex-col">
            <CardHeader className="flex flex-col items-center justify-center">
                <CardTitle className="text-center text-2xl font-bold my-2">
                    Small Talk
                </CardTitle>
                <hr className="w-full border-t border-gray-300" />
            </CardHeader>

            <CardContent className="flex flex-col items-center justify-center flex-grow">
                <p className="text-center text-gray-600 mb-4">
                    Practice your English speaking skills with our AI-powered conversation partner.
                </p>
            </CardContent>

            <CardFooter className="flex justify-center items-center p-4">
                <Button className="w-full">
                    Start a Session
                </Button>
            </CardFooter>
        </Card>
    );
};

export default SessionCreateCard;