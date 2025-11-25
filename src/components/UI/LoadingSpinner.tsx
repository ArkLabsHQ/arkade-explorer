export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-arkade-purple border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-2 border-4 border-arkade-orange border-t-transparent rounded-full animate-spin-reverse"></div>
      </div>
    </div>
  );
}
