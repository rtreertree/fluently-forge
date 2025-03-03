import { CheckCircledIcon } from "@radix-ui/react-icons";


interface FormSuccessrProps {
    message?: string;
};

export const FormSuccess = ( {message}: FormSuccessrProps) => {
    if (!message) return null;
    return (
        <div className="bg-emerald-500/15 p-3 rounded-md text-destructive flex items-center gap-x-2 text-emerald-500 select-none">
            <CheckCircledIcon />
            <p>{message}</p>
        </div>
    )
};