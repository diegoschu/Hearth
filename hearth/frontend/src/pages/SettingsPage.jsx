import { useState, useEffect, useCallback } from 'react';
import { settings as settingsApi } from '../utils/api';

const AUTONOMY_CATEGORIES = [
  { id: 'calendar', label: 'Calendar & Scheduling', icon: '\uD83D\uDCC5', level: 2, description: 'Adding events, resolving conflicts, sending reminders' },
  { id: 'meals', label: 'Meal Planning', icon: '\uD83C\uDF7D\uFE0F', level: 1, description: 'Weekly plans, recipe suggestions, grocery lists' },
  { id: 'groceries', label: 'Grocery Ordering', icon: '\uD83D\uDED2', level: 1, description: 'Generating lists, placing orders, reordering staples' },
  { id: 'consumables', label: 'Household Supplies', icon: '\uD83E\uDDF1', level: 3, description: 'Diapers, wipes, cleaning supplies, toiletries' },
  { id: 'medical', label: 'Medical & Health', icon: '\uD83C\uDFE5', level: 1, description: 'Appointment scheduling, medication reminders, records' },
  { id: 'transport', label: 'Rides & Logistics', icon: '\uD83D\uDE97', level: 2, description: 'Pickup/dropoff coordination, carpool, route planning' },
  { id: 'gifts', label: 'Birthdays & Gifts', icon: '\uD83C\uDF81', level: 1, description: 'Tracking birthdays, gift purchasing, RSVPs' },
  { id: 'inventory', label: "Kids' Inventory", icon: '\uD83D\uDC5F', level: 1, description: 'Shoe sizes, clothing fits, gear condition' },
];

const AUTONOMY_LEVELS = [
  { value: 1, label: 'Dashboard', emoji: '\uD83D\uDC41\uFE0F', desc: 'I see it, you decide', bgActive: 'bg-dad-bg', textActive: 'text-dad-text' },
  { value: 2, label: 'Co-pilot', emoji: '\uD83E\uDD1D', desc: 'I suggest, you approve', bgActive: 'bg-warning-bg', textActive: 'text-hearth-warm' },
  { value: 3, label: 'Autopilot', emoji: '\uD83D\uDE80', desc: 'I handle it, you\'re notified', bgActive: 'bg-success-bg', textActive: 'text-success' },
];

export default function SettingsPage() {
  const [categories, setCategories] = useState(AUTONOMY_CATEGORIES);

  const loadSettings = useCallback(async () => {
    try {
      const res = await settingsApi.getAutonomy();
      if (res.data?.length > 0) {
        setCategories((cats) =>
          cats.map((cat) => {
            const setting = res.data.find((s) => s.category === cat.id);
            return setting ? { ...cat, level: setting.level } : cat;
          })
        );
      }
    } catch {
      // Keep default mock data
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleUpdate = async (catId, level) => {
    setCategories((cats) =>
      cats.map((c) => (c.id === catId ? { ...c, level } : c))
    );
    try {
      await settingsApi.updateAutonomy(catId, level);
    } catch {
      // Revert on failure
      loadSettings();
    }
  };

  return (
    <div className="px-5 pb-5">
      <div className="font-serif text-lg font-semibold mb-1 text-hearth-dark">Autonomy Settings</div>
      <div className="text-xs text-hearth-muted mb-4">Control how much the agent does on its own</div>

      {/* Level legend */}
      <div className="flex gap-2 mb-5 p-3 bg-hearth-surface rounded-xl">
        {AUTONOMY_LEVELS.map((l) => (
          <div key={l.value} className="flex-1 text-center">
            <div className="text-lg mb-1">{l.emoji}</div>
            <div className="text-[11px] font-semibold text-hearth-dark">{l.label}</div>
            <div className="text-[10px] text-hearth-muted mt-0.5">{l.desc}</div>
          </div>
        ))}
      </div>

      {/* Category cards */}
      {categories.map((cat) => (
        <div key={cat.id} className="bg-white rounded-[14px] p-3.5 mb-2.5 border border-hearth-border">
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="text-xl">{cat.icon}</span>
            <div>
              <div className="text-sm font-semibold text-hearth-dark">{cat.label}</div>
              <div className="text-[11px] text-hearth-muted">{cat.description}</div>
            </div>
          </div>
          <div className="flex gap-0 bg-hearth-surface-dark rounded-[10px] p-[3px]">
            {AUTONOMY_LEVELS.map((level) => {
              const active = cat.level === level.value;
              return (
                <button
                  key={level.value}
                  onClick={() => handleUpdate(cat.id, level.value)}
                  className={`flex-1 py-[7px] px-1 rounded-lg text-[11px] text-center cursor-pointer transition-all ${
                    active
                      ? `font-semibold ${level.bgActive} ${level.textActive}`
                      : 'font-normal text-[#B5B0AA] bg-transparent'
                  }`}
                >
                  {level.emoji} {level.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Per-parent info */}
      <div className="bg-hearth-surface rounded-2xl p-4 mt-5 border border-hearth-border-dark">
        <div className="text-[13px] font-semibold mb-1.5">\uD83D\uDC64 Per-Parent Settings</div>
        <div className="text-xs text-[#7A7570] leading-relaxed">
          Each parent can set their own autonomy preferences. Mom might want Autopilot on groceries while Dad prefers Co-pilot.
        </div>
        <div className="flex gap-2 mt-2.5">
          <div className="flex-1 py-2 px-3 bg-dad-bg rounded-lg text-center text-xs font-medium text-dad-text">
            Dad's Preferences
          </div>
          <div className="flex-1 py-2 px-3 bg-mom-bg rounded-lg text-center text-xs font-medium text-mom-text">
            Mom's Preferences
          </div>
        </div>
      </div>
    </div>
  );
}
