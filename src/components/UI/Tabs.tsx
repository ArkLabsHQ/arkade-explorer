import { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="space-y-4">
      <div className="flex space-x-2 border-b-2 border-arkade-purple">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 font-bold uppercase text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-arkade-purple text-white border-2 border-arkade-purple border-b-0 -mb-0.5'
                : 'text-arkade-gray hover:text-arkade-purple'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div>
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}
