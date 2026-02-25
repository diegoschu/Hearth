export function formatDateLabel(value) {
  if (!value) return 'Unknown date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTimeRange(start, end) {
  if (!start) return 'Time TBD';
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return 'Time TBD';

  const startText = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (!end) return startText;

  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return startText;

  return `${startText} – ${endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export function getFeedItemTitle(item) {
  return item?.parsed?.eventName || 'Untitled event';
}
