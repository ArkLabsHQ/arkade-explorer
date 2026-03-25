'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivityStream } from '@/providers/activity-stream-provider';
import { useServerInfo } from '@/providers/server-info-provider';
import { isValidTxid, isValidOutpoint } from '@/lib/validation';
import { truncateHash } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';

const EASE_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

interface TerminalLine {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'system' | 'input' | 'link';
  timestamp?: number;
  href?: string;
}

const HELP_TEXT: TerminalLine[] = [
  { id: 'help-1', text: 'Available commands:', type: 'system' },
  { id: 'help-2', text: '  help              Show this help message', type: 'info' },
  { id: 'help-3', text: '  clear             Clear the terminal', type: 'info' },
  { id: 'help-4', text: '  search <query>    Search for a txid or address', type: 'info' },
  { id: 'help-5', text: '  status            Show server info', type: 'info' },
  { id: 'help-6', text: '', type: 'info' },
  { id: 'help-7', text: 'You can also paste a txid or address directly to navigate.', type: 'system' },
];

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

function activityToTerminalLine(activity: {
  id: string;
  type: string;
  txid?: string;
  description: string;
  timestamp: number;
}): TerminalLine {
  const time = formatTime(activity.timestamp);
  const txLabel = activity.txid ? ` (tx: ${truncateHash(activity.txid, 8, 6)})` : '';

  return {
    id: `activity-${activity.id}`,
    text: `[${time}] ${activity.description}${txLabel}`,
    type: activity.type === 'round' ? 'success' : 'info',
    timestamp: activity.timestamp,
    href: activity.txid ? `/tx/${activity.txid}` : undefined,
  };
}

export function TerminalView() {
  const router = useRouter();
  const { activities, subscribeToNewActivity } = useActivityStream();
  const { serverInfo } = useServerInfo();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  // Build welcome message
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const network = serverInfo?.network || 'bitcoin';
    const session = serverInfo?.sessionDuration || '60';

    const welcome: TerminalLine[] = [
      { id: 'w1', text: 'Arkade Explorer v0.9.1', type: 'success' },
      { id: 'w2', text: `Network: ${network} | Session: ${session}s`, type: 'info' },
      { id: 'w3', text: "Type 'help' for commands or search for a txid/address", type: 'system' },
      { id: 'w4', text: '', type: 'info' },
    ];

    setLines(welcome);
  }, [serverInfo]);

  // Subscribe to new activity events
  useEffect(() => {
    const unsubscribe = subscribeToNewActivity(() => {
      // Activity state will be read on next render cycle
    });
    return unsubscribe;
  }, [subscribeToNewActivity]);

  // Add activity lines when new activities appear
  const processedActivitiesRef = useRef(new Set<string>());
  useEffect(() => {
    const newLines: TerminalLine[] = [];
    for (const activity of activities) {
      if (!processedActivitiesRef.current.has(activity.id)) {
        processedActivitiesRef.current.add(activity.id);
        newLines.push(activityToTerminalLine(activity));
      }
    }
    if (newLines.length > 0) {
      setLines(prev => [...prev, ...newLines]);
    }
  }, [activities]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Cmd+K focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const addLine = useCallback((line: TerminalLine) => {
    setLines(prev => [...prev, line]);
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Add input echo
    addLine({ id: `in-${Date.now()}`, text: `> ${trimmed}`, type: 'input' });
    setCommandHistory(prev => [trimmed, ...prev].slice(0, 50));
    setHistoryIndex(-1);

    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (command) {
      case 'help':
        setLines(prev => [...prev, ...HELP_TEXT]);
        break;

      case 'clear':
        setLines([]);
        break;

      case 'status': {
        const statusLines: TerminalLine[] = [
          { id: `s-${Date.now()}-1`, text: '--- Server status ---', type: 'system' },
          { id: `s-${Date.now()}-2`, text: `  Network:    ${serverInfo?.network || 'unknown'}`, type: 'info' },
          { id: `s-${Date.now()}-3`, text: `  Version:    ${serverInfo?.version || 'unknown'}`, type: 'info' },
          { id: `s-${Date.now()}-4`, text: `  Session:    ${serverInfo?.sessionDuration || '--'}s`, type: 'info' },
          { id: `s-${Date.now()}-5`, text: `  Exit delay: ${serverInfo?.unilateralExitDelay || '--'} blocks`, type: 'info' },
          { id: `s-${Date.now()}-6`, text: `  Activities: ${activities.length} recent`, type: 'info' },
        ];
        setLines(prev => [...prev, ...statusLines]);
        break;
      }

      case 'search':
        if (!args) {
          addLine({ id: `err-${Date.now()}`, text: 'Usage: search <txid|address>', type: 'error' });
        } else {
          navigateToQuery(args);
        }
        break;

      default:
        // Treat as direct search
        navigateToQuery(trimmed);
        break;
    }
  }, [addLine, serverInfo, activities.length]);

  const navigateToQuery = useCallback((q: string) => {
    if (isValidTxid(q)) {
      addLine({ id: `nav-${Date.now()}`, text: `Navigating to transaction ${truncateHash(q)}...`, type: 'success' });
      router.push(`/tx/${q}`);
    } else if (isValidOutpoint(q)) {
      addLine({ id: `nav-${Date.now()}`, text: `Navigating to outpoint ${truncateHash(q)}...`, type: 'success' });
      router.push(`/tx/${q}`);
    } else if (q.startsWith('tark1') || q.startsWith('ark1')) {
      addLine({ id: `nav-${Date.now()}`, text: `Navigating to address ${truncateHash(q)}...`, type: 'success' });
      router.push(`/address/${q}`);
    } else {
      addLine({ id: `nav-${Date.now()}`, text: `Searching for "${truncateHash(q)}"...`, type: 'info' });
      router.push(`/tx/${q}`);
    }
  }, [addLine, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  }, [input, handleCommand, commandHistory, historyIndex]);

  const lineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'system': return 'text-amber-400';
      case 'input': return 'text-muted-foreground';
      case 'link': return 'text-primary';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background font-mono">
      {/* Terminal output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5"
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15, ease: EASE_OUT }}
              className="motion-reduce:animate-none"
            >
              {line.href ? (
                <a
                  href={line.href}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(line.href!);
                  }}
                  className={`text-sm leading-relaxed cursor-pointer hover:underline ${lineColor(line.type)}`}
                >
                  {line.text}
                </a>
              ) : (
                <p className={`text-sm leading-relaxed ${lineColor(line.type)}`}>
                  {line.text || '\u00A0'}
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Blinking cursor indicator if no lines */}
        {lines.length === 0 && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {'> _'}
          </p>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-green-400 shrink-0 select-none">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or paste a txid/address..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none caret-green-400"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-secondary border border-border text-[10px] font-mono text-muted-foreground">
            {typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform ?? '') ? '\u2318' : 'Ctrl+'}K
          </kbd>
        </div>
      </div>
    </div>
  );
}
