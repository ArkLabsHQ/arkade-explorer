import { AlertCircle } from "lucide-react";

export function ErrorMessage({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-3" />
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    );
}
