interface Tab {
  id: string;
  label: string;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function TabNav({ tabs, activeTab, onChange }: TabNavProps) {
  return (
    <div className="flex gap-1 border-b border-slate-200 overflow-x-auto scrollbar-none">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors duration-150 whitespace-nowrap shrink-0 border-b-2 -mb-px ${
            activeTab === tab.id
              ? 'text-blue-600 border-blue-500'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
