import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface ImageLightboxProps {
    src: string;
    alt?: string;
    className?: string;
}

export function ImageLightbox({ src, alt = "", className = "" }: ImageLightboxProps) {
    const [open, setOpen] = useState(false);

    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        if (!open) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };

        // Lock body scroll while open
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKey);

        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", onKey);
        };
    }, [open, close]);

    return (
        <>
            <img
                src={src}
                alt={alt}
                className={`${className} cursor-pointer`}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(true);
                }}
            />

            {typeof document !== "undefined" &&
                createPortal(
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm cursor-pointer"
                                onClick={close}
                            >
                                <motion.img
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: [0.165, 0.84, 0.44, 1] }}
                                    src={src}
                                    alt={alt}
                                    className="max-w-[80vw] max-h-[80vh] rounded-lg shadow-2xl cursor-default"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body,
                )}
        </>
    );
}
