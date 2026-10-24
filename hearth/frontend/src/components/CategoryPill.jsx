const categoryConfig = {
  school: { label: 'School', icon: '📚', color: 'bg-blue-50 text-blue-700 ring-blue-200' },
  medical: { label: 'Medical', icon: '🏥', color: 'bg-red-50 text-red-700 ring-red-200' },
  extracurricular: { label: 'Activity', icon: '⚽', color: 'bg-purple-50 text-purple-700 ring-purple-200' },
  social: { label: 'Social', icon: '🎉', color: 'bg-pink-50 text-pink-700 ring-pink-200' },
  household: { label: 'Household', icon: '🏠', color: 'bg-amber-50 text-amber-700 ring-amber-200' },
  other: { label: 'Other', icon: '📌', color: 'bg-warmgray-100 text-warmgray-600 ring-warmgray-200' },
};

export default function CategoryPill({ category }) {
  const config = categoryConfig[category] || categoryConfig.other;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.color}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
