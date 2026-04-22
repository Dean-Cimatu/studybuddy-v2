import { useEffect, useRef, useState } from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

function playClick() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // AudioContext may be unavailable (e.g. during SSR or in tests)
  }
}

export function TabNav({ tabs, activeTab, onChange }: TabNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    const container = containerRef.current;
    if (!el || !container) return;
    const containerLeft = container.getBoundingClientRect().left;
    const elRect = el.getBoundingClientRect();
    setIndicator({ left: elRect.left - containerLeft + container.scrollLeft, width: elRect.width, ready: true });
  }, [activeTab]);

  function handleClick(id: string) {
    if (id !== activeTab) {
      playClick();
      onChange(id);
    }
  }

  return (
    <div ref={containerRef} className="relative flex overflow-x-auto scrollbar-none">
      {/* Sliding indicator */}
      {indicator.ready && (
        <div
          className="absolute bottom-0 h-0.5 bg-blue-500 rounded-full transition-all duration-200 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}

      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={el => { tabRefs.current[tab.id] = el; }}
            onClick={() => handleClick(tab.id)}
            className={`
              relative px-4 py-2.5 text-sm font-medium cursor-pointer whitespace-nowrap shrink-0
              transition-all duration-150 rounded-t-md
              ${isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40'
              }
            `}
            style={{
              transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
