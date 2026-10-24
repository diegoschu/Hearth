import { useState } from 'react';
import Avatar from '../components/Avatar';

const autonomyLevels = {
  1: {
    label: 'Manual',
    description: 'Always ask before taking action',
    icon: '🛡️',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    activeColor: 'bg-blue-100 border-blue-400 ring-1 ring-blue-300',
  },
  2: {
    label: 'Co-pilot',
    description: 'Suggest actions for your review',
    icon: '🤝',
    color: 'bg-hearth-50 border-hearth-200 text-hearth-700',
    activeColor: 'bg-hearth-100 border-hearth-400 ring-1 ring-hearth-300',
  },
  3: {
    label: 'Autopilot',
    description: 'Auto-confirm high-confidence events',
    icon: '🚀',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    activeColor: 'bg-emerald-100 border-emerald-400 ring-1 ring-emerald-300',
  },
};

const categoryIcons = {
  calendar: '📅', meals: '🍽️', groceries: '🛒', consumables: '📦',
  medical: '🏥', transport: '🚗', gifts: '🎁', inventory: '📋',
  school: '📚', extracurricular: '⚽', social: '🎉', household: '🏠', other: '📌',
};

const categoryDescriptions = {
  calendar: 'General calendar events', meals: 'Meal planning and coordination',
  groceries: 'Grocery lists and shopping', consumables: 'Household supplies',
  medical: 'Medical appointments and health', transport: 'Transportation and pickups',
  gifts: 'Gift planning and occasions', inventory: 'Home inventory tracking',
  school: 'School-related events', extracurricular: 'After-school activities',
  social: 'Social gatherings and parties', household: 'Household tasks and maintenance',
  other: 'Uncategorized items',
};

function AutonomyCard({ setting, onUpdate }) {
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async (level) => {
    if (level === setting.level) return;
    setUpdating(true);
    await onUpdate(setting.category, level);
    setUpdating(false);
  };

  const icon = categoryIcons[setting.category] || '📌';
  const desc = categoryDescriptions[setting.category] || '';
  const isMedical = setting.category === 'medical';

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-warmgray-50 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">{icon}</span>
        </div>
        <div>
          <h4 className="font-medium text-warmgray-900 capitalize">{setting.category}</h4>
          <p className="text-xs text-warmgray-500">{desc}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((level) => {
          const config = autonomyLevels[level];
          const isActive = setting.level === level;
          const isBlocked = isMedical && level === 3;

          return (
            <button
              key={level}
              onClick={() => !isBlocked && handleUpdate(level)}
              disabled={updating || isBlocked}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                isActive ? config.activeColor : `${config.color} opacity-60 hover:opacity-80`
              } ${isBlocked ? 'opacity-30 cursor-not-allowed' : ''}`}
              title={isBlocked ? 'Autopilot is not available for medical events' : config.description}
            >
              <span className="text-base block">{config.icon}</span>
              <span className="text-xs font-medium block mt-0.5">{config.label}</span>
            </button>
          );
        })}
      </div>
      {isMedical && (
        <p className="text-xs text-warmgray-500 mt-2 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-warmgray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          Autopilot disabled for safety — medical events always require review
        </p>
      )}
    </div>
  );
}

export default function SettingsPage({ autonomy, family, onUpdateAutonomy, user }) {
  return (
    <div className="space-y-8">
      {family && (
        <div>
          <h2 className="text-lg font-semibold text-warmgray-900 mb-3">Family</h2>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-warmgray-900">{family.name}</h3>
                <p className="text-sm text-warmgray-500">
                  {family.members?.length || 0} member{(family.members?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="bg-warmgray-50 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-warmgray-500 font-medium uppercase tracking-wide">Invite code</p>
                <p className="text-sm font-mono font-bold text-warmgray-800">{family.invite_code}</p>
              </div>
            </div>
            {family.members?.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {family.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 bg-warmgray-50 rounded-xl px-3 py-2">
                    <Avatar name={m.name} picture={m.picture} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-warmgray-800">{m.name}</p>
                      <p className="text-xs text-warmgray-500">{m.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-warmgray-900">Autonomy settings</h2>
          <p className="text-sm text-warmgray-500">
            Control how much Hearth can do automatically for each category
          </p>
        </div>

        <div className="card p-4 mb-4 bg-warmgray-50 border-warmgray-100">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[1, 2, 3].map((level) => {
              const config = autonomyLevels[level];
              return (
                <div key={level}>
                  <span className="text-lg">{config.icon}</span>
                  <p className="text-xs font-semibold text-warmgray-700 mt-0.5">{config.label}</p>
                  <p className="text-[11px] text-warmgray-500">{config.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {autonomy.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {autonomy.map((s) => (
              <AutonomyCard key={s.category} setting={s} onUpdate={onUpdateAutonomy} />
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <p className="text-sm text-warmgray-500">
              Autonomy preferences will appear once your account is fully set up.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
