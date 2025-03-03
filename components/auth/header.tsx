import { cn } from "@/lib/utils";


interface HeaderProps {
    label: string;
}

export const Header = ({ label }: HeaderProps) => {
    return (
        <div className="w-full flex flex-col items-center select-none">
            <h1 className="text-4xl font-bold pb-2">
                Fluently Forge
            </h1>
            <p className="text-muted-foreground text-sm">
                {label}
            </p>
        </div>
    )
};