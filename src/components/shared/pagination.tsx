import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
    if (totalPages <= 1) return null;

    const maxVisible = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    const buttonBase =
        "inline-flex items-center justify-center rounded-lg border border-border text-sm font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <nav
            className={cn("flex items-center justify-center gap-1.5 py-4", className)}
            aria-label="Pagination"
        >
            {/* Previous */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={cn(
                    buttonBase,
                    "h-9 w-9 bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                )}
                aria-label="Previous page"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>

            {/* First page + leading ellipsis */}
            {startPage > 1 && (
                <>
                    <button
                        onClick={() => onPageChange(1)}
                        className={cn(
                            buttonBase,
                            "h-9 min-w-9 px-2 bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                        )}
                    >
                        1
                    </button>
                    {startPage > 2 && (
                        <span
                            className="px-1 text-muted-foreground text-sm select-none"
                            aria-hidden="true"
                        >
                            ...
                        </span>
                    )}
                </>
            )}

            {/* Visible page numbers */}
            {pages.map((page) => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    aria-current={page === currentPage ? "page" : undefined}
                    className={cn(
                        buttonBase,
                        "h-9 min-w-9 px-2",
                        page === currentPage
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                    )}
                >
                    {page}
                </button>
            ))}

            {/* Trailing ellipsis + last page */}
            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && (
                        <span
                            className="px-1 text-muted-foreground text-sm select-none"
                            aria-hidden="true"
                        >
                            ...
                        </span>
                    )}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        className={cn(
                            buttonBase,
                            "h-9 min-w-9 px-2 bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                        )}
                    >
                        {totalPages}
                    </button>
                </>
            )}

            {/* Next */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={cn(
                    buttonBase,
                    "h-9 w-9 bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                )}
                aria-label="Next page"
            >
                <ChevronRight className="h-4 w-4" />
            </button>
        </nav>
    );
}
