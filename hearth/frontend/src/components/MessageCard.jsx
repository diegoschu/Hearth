export default function MessageCard({ item, onConfirm, onDismiss }) {
  const isConfirmed = item.status === 'confirmed' || item.status === 'auto_confirmed';
  const conf = item.parsed?.confidence ?? 0;

  const sourceIcon = item.source?.type === 'whatsapp' ? '\uD83D\uDCAC' : '\uD83D\uDCE7';
  const sourceName = item.source?.name || 'Unknown source';

  return (
    <div
      className={`rounded-2xl p-4 mb-3 border transition-colors ${
        isConfirmed
          ? 'bg-[#F8FBF6] border-[#C8E0B8]'
          : 'bg-white border-hearth-border'
      } shadow-[0_1px_3px_rgba(0,0,0,0.03)]`}
    >
      {/* Top row: source + badges */}
      <div className="flex justify-between items-center mb-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] text-hearth-muted">
          {sourceIcon} {item.source?.type === 'whatsapp' ? 'WhatsApp' : 'Gmail'} &middot; {sourceName}
        </span>
        <div className="flex gap-1.5 items-center">
          <ConfidenceBadge value={conf} />
          <StatusChip status={item.status} />
        </div>
      </div>

      {/* Raw message */}
      <div className="text-[13px] text-[#5A5550] leading-relaxed py-2.5 px-3 bg-hearth-surface rounded-[10px] mb-3 border-l-[3px] border-hearth-border-dark italic">
        &ldquo;{item.rawMessage}&rdquo;
      </div>

      {/* Parsed data */}
      <div className="mb-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#B5B0AA] mb-1">
          Agent Parsed
        </div>
        <div className="text-[15px] font-semibold text-hearth-dark mb-0.5">
          {item.parsed?.eventName || 'Untitled Event'}
        </div>
        <div className="text-[13px] text-[#5A5550] leading-relaxed">
          \uD83D\uDCC5 {item.parsed?.date || 'No date'}{' '}
          {item.parsed?.time && `\u00B7 ${item.parsed.time}`}
          {item.parsed?.location && (
            <>
              <br />\uD83D\uDCCD {item.parsed.location}
            </>
          )}
          {item.parsed?.notes && (
            <>
              <br />\uD83D\uDCDD {item.parsed.notes}
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isConfirmed && (
        <div className="mt-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#B5B0AA] mb-1.5">
            Actions
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onConfirm(item.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-xs font-medium bg-hearth-dark text-hearth-cream hover:bg-[#4A4540] transition-colors cursor-pointer"
            >
              \u2713 Confirm & Add
            </button>
            <button
              onClick={() => onDismiss(item.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-xs font-medium bg-hearth-surface-dark text-[#5A5550] hover:bg-hearth-border transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ value }) {
  const pct = Math.round(value * 100);
  let colors = 'bg-danger-bg text-danger';
  if (value > 0.9) colors = 'bg-success-bg text-success';
  else if (value > 0.8) colors = 'bg-warning-bg text-warning';

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-[10px] ${colors}`}>
      {pct}% sure
    </span>
  );
}

function StatusChip({ status }) {
  const isConfirmed = status === 'confirmed' || status === 'auto_confirmed';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-[10px] ${
        isConfirmed ? 'bg-success-bg text-success' : 'bg-warning-bg text-hearth-warm'
      }`}
    >
      {isConfirmed ? '\u2713 Done' : '\u23F3 Pending'}
    </span>
  );
}
