import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type MoneyUnit = "sats" | "btc";

interface MoneyDisplayContextType {
    unit: MoneyUnit;
    toggleUnit: () => void;
    setUnit: (unit: MoneyUnit) => void;
}

const MoneyDisplayContext = createContext<MoneyDisplayContextType | undefined>(undefined);

const STORAGE_KEY = "arkade-explorer-money-unit";

export function MoneyDisplayProvider({ children }: { children: ReactNode }) {
    const [unit, setUnitState] = useState<MoneyUnit>("btc");

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === "btc" || stored === "sats") {
                setUnitState(stored);
            }
        } catch {
            // localStorage unavailable
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, unit);
        } catch (error) {
            console.error("Failed to save money unit preference:", error);
        }
    }, [unit]);

    const toggleUnit = () => {
        setUnitState((prev) => (prev === "sats" ? "btc" : "sats"));
    };

    const setUnit = (newUnit: MoneyUnit) => {
        setUnitState(newUnit);
    };

    return (
        <MoneyDisplayContext.Provider value={{ unit, toggleUnit, setUnit }}>
            {children}
        </MoneyDisplayContext.Provider>
    );
}

export function useMoneyDisplay() {
    const context = useContext(MoneyDisplayContext);
    if (context === undefined) {
        throw new Error("useMoneyDisplay must be used within a MoneyDisplayProvider");
    }
    return context;
}
