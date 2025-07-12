import { Card } from "@/components/ui/card";

export const Box = () => {
    return (
        <Card className="w-full max-w-md mx-auto border text-center flex flex-col items-center justify-center p-6 rounded-2xl shadow-md bg-background">
            <h1 className="text-2xl font-bold mb-4 pt-2">Session List</h1>
            <p className="text-gray-500">This is a placeholder for the session list.</p>
        </Card>
    );
}