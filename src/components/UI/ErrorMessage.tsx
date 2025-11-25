import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="flex items-center space-x-3 p-4 border-2 border-arkade-orange bg-arkade-black text-arkade-orange">
      <AlertCircle size={24} />
      <p className="font-bold uppercase">{message}</p>
    </div>
  );
}
