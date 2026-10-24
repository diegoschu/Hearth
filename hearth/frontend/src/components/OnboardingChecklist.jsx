const steps = [
  {
    id: 'family',
    title: 'Set up your family',
    description: 'Create a family or join one with an invite code',
    icon: '👨‍👩‍👧‍👦',
  },
  {
    id: 'source',
    title: 'Connect a source',
    description: 'Link a WhatsApp group, Gmail, or Google Calendar',
    icon: '🔗',
  },
  {
    id: 'review',
    title: 'Review your first item',
    description: 'Confirm or dismiss a parsed event from your feed',
    icon: '✅',
  },
  {
    id: 'calendar',
    title: 'Check your calendar',
    description: 'See confirmed events on your family calendar',
    icon: '📅',
  },
];

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export default function OnboardingChecklist({ completedSteps = {}, onStepClick }) {
  const completedCount = steps.filter((s) => completedSteps[s.id]).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  if (completedCount === steps.length) return null;

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-warmgray-900">Welcome to Hearth</h2>
          <p className="text-sm text-warmgray-500">Complete these steps to get started</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-warmgray-600">{completedCount}/{steps.length}</span>
          <div className="w-20 h-2 bg-warmgray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-hearth-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => {
          const done = completedSteps[step.id];
          const isNext = !done && steps.slice(0, index).every((s) => completedSteps[s.id]);
          return (
            <button
              key={step.id}
              onClick={() => !done && onStepClick?.(step.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                done
                  ? 'bg-emerald-50/50 opacity-70'
                  : isNext
                  ? 'bg-hearth-50 ring-1 ring-hearth-200 hover:ring-hearth-300'
                  : 'bg-warmgray-50 opacity-60'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                done ? 'bg-emerald-100' : isNext ? 'bg-hearth-100' : 'bg-warmgray-100'
              }`}>
                {done ? <CheckIcon /> : <span className="text-lg">{step.icon}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? 'text-emerald-700 line-through' : 'text-warmgray-800'}`}>
                  {step.title}
                </p>
                <p className="text-xs text-warmgray-500 truncate">{step.description}</p>
              </div>
              {isNext && (
                <svg className="w-5 h-5 text-hearth-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
