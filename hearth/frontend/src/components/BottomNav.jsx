const TABS = [
  { id: 'feed', label: 'Feed', icon: '\uD83C\uDFE0' },
  { id: 'calendar', label: 'Calendar', icon: '\uD83D\uDCC5' },
  { id: 'sources', label: 'Sources', icon: '\uD83D\uDD0C' },
  { id: 'settings', label: 'Settings', icon: '\u2699\uFE0F' },
];

export default function BottomNav({ activeTab, onTabChange, pendingCount = 0 }) {
  return (
    <div className="sticky bottom-0 flex justify-around px-5 pt-3 pb-5 bg-hearth-cream/95 backdrop-blur-md border-t border-hearth-border">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center gap-0.5 text-[10px] transition-colors cursor-pointer relative ${
            activeTab === tab.id
              ? 'font-semibold text-hearth-warm'
              : 'font-normal text-hearth-muted'
          }`}
        >
          <span className="text-xl">{tab.icon}</span>
          {tab.label}
          {tab.id === 'feed' && pendingCount > 0 && (
            <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-hearth-warm text-white text-[9px] font-bold flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
