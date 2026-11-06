import { TopNav } from "@/components/nav/top-nav";
import { Footer } from "@/components/nav/footer";

export function DynamicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <TopNav />
            <main className="flex-1 min-w-0 max-w-6xl mx-auto w-full px-4 py-8 sm:px-6 sm:py-10">
                {children}
            </main>
            <Footer />
        </div>
    );
}
