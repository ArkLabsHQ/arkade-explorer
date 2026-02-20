import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  className?: string;
}

export function ImageLightbox({ src, alt = '', className = '' }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
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
      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={close}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-[80vw] max-h-[80vh] rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
}
