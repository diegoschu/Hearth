export default function DigestCard({ digest }) {
  const greeting = getGreeting();

  return (
    <div className="bg-gradient-to-br from-hearth-dark to-[#4A4540] rounded-2xl p-5 mb-4 text-white">
      <div className="font-serif text-base font-semibold mb-1">
        {greeting}
      </div>
      <div className="text-xs opacity-60 mb-3.5">
        Here's what your family has going on
      </div>
      <div className="flex gap-3">
        <StatItem value={digest?.pendingReview ?? 0} label="Need Review" />
        <StatItem value={digest?.conflicts ?? 0} label="Conflicts" />
        <StatItem value={digest?.eventsToday ?? 0} label="Today" />
      </div>
    </div>
  );
}

function StatItem({ value, label }) {
  return (
    <div className="flex-1 bg-white/[0.08] rounded-[10px] py-2.5 px-3 text-center">
      <div className="text-[22px] font-bold font-serif">{value}</div>
      <div className="text-[10px] opacity-50 mt-0.5">{label}</div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning \u2600\uFE0F';
  if (hour < 17) return 'Good afternoon \u2600\uFE0F';
  return 'Good evening \uD83C\uDF19';
}
