interface ArkadeLogoProps {
    className?: string;
    showText?: boolean;
    size?: "sm" | "md" | "lg";
}

export function ArkadeLogo({ className, showText = true, size = "md" }: ArkadeLogoProps) {
    const config = {
        sm: { icon: 14, text: "0.8125rem", offset: 0 },
        md: { icon: 16, text: "0.9375rem", offset: 0 },
        lg: { icon: 20, text: "1.125rem", offset: 0 },
    }[size];

    // The icon's visual center of mass is ~40% from top (the arch pulls it up).
    // We use a viewBox crop to remove the top dead space from the arch peak,
    // shifting the optical center down to match the text center.
    return (
        <span className={`inline-flex items-center gap-1.5 ${className || ""}`}>
            <svg
                width={config.icon}
                height={config.icon}
                viewBox="0 0 35 35"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary shrink-0"
                aria-hidden="true"
            >
                <path
                    d="M0 8.75L8.75 0H26.25L35 8.75V17.5H26.25V8.75H8.75V17.5H2.45431e-07L0 8.75Z"
                    fill="currentColor"
                />
                <path d="M8.75 26.25V17.5H26.25V26.25H8.75Z" fill="currentColor" />
                <path d="M8.75 26.25H2.45431e-07V35H8.75V26.25Z" fill="currentColor" />
                <path d="M26.25 26.25V35H35V26.25H26.25Z" fill="currentColor" />
            </svg>
            {showText && (
                <span
                    className="font-heading leading-none translate-y-[1.5px]"
                    style={{ fontSize: config.text }}
                >
                    <span className="font-semibold text-foreground">Arkade</span>{" "}
                    <span className="font-normal text-muted-foreground">Explorer</span>
                </span>
            )}
        </span>
    );
}
