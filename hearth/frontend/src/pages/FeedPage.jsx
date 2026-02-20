import { useState, useEffect, useCallback } from 'react';
import DigestCard from '../components/DigestCard';
import MessageCard from '../components/MessageCard';
import { feed, digest as digestApi } from '../utils/api';

// Mock data for demo / when backend is not connected
const MOCK_MESSAGES = [
  {
    id: 'mock-1',
    source: { type: 'whatsapp', name: 'Lincoln Elementary Parents' },
    rawMessage: 'Hi parents! Picture Day has been moved to March 3rd. Please make sure kids wear solid colors. No logos please!',
    parsed: {
      eventName: 'Picture Day',
      date: 'Mon, March 3',
      time: 'During school hours',
      notes: 'Solid colors, no logos',
      actionItems: ['Add to calendar', 'Set outfit reminder for March 2'],
      category: 'school',
      confidence: 0.95,
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    source: { type: 'whatsapp', name: 'Soccer Team U8' },
    rawMessage: 'Practice canceled Thursday due to rain. Makeup session Saturday 9am same field.',
    parsed: {
      eventName: 'Soccer Practice (Makeup)',
      date: 'Sat, March 1',
      time: '9:00 AM',
      location: 'Riverside Field',
      notes: 'Originally Thu \u2192 moved to Sat due to rain',
      actionItems: ['Remove Thu from calendar', 'Add Sat session'],
      category: 'extracurricular',
      confidence: 0.88,
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    source: { type: 'gmail', name: 'drsmith@pediatrics.com' },
    rawMessage: 'Reminder: Annual checkup for Emma scheduled Feb 28 at 10:30 AM',
    parsed: {
      eventName: 'Emma \u2014 Annual Checkup',
      date: 'Fri, Feb 28',
      time: '10:30 AM',
      location: 'Dr. Smith Pediatrics, 420 Oak Ave',
      notes: 'Bring insurance card, vaccination record',
      actionItems: ['Confirm on calendar', 'Assign to parent'],
      category: 'medical',
      confidence: 0.97,
    },
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-4',
    source: { type: 'whatsapp', name: 'Lincoln Elementary Parents' },
    rawMessage: "Don't forget \u2014 Science Fair projects due next Friday! Kids need a tri-fold board.",
    parsed: {
      eventName: 'Science Fair Deadline',
      date: 'Fri, March 7',
      time: 'End of school day',
      notes: 'Needs tri-fold board',
      actionItems: ['Add deadline to calendar', "Add 'Buy tri-fold board' to shopping list"],
      category: 'school',
      confidence: 0.92,
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];

const MOCK_DIGEST = {
  pendingReview: 3,
  conflicts: 1,
  eventsToday: 5,
};

export default function FeedPage() {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [digestData, setDigestData] = useState(MOCK_DIGEST);
  const [loading, setLoading] = useState(false);

  // Try loading from real API; fall back to mock data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [feedRes, digestRes] = await Promise.all([
        feed.list({ limit: 20 }),
        digestApi.get(),
      ]);
      if (feedRes.data?.items?.length > 0) {
        setMessages(feedRes.data.items);
      }
      if (digestRes.data) {
        setDigestData(digestRes.data);
      }
    } catch {
      // Keep mock data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirm = async (id) => {
    // Optimistic update
    setMessages((msgs) =>
      msgs.map((m) => (m.id === id ? { ...m, status: 'confirmed' } : m))
    );
    try {
      await feed.confirm(id);
    } catch {
      // If API fails, revert would go here — for now, keep optimistic state
    }
  };

  const handleDismiss = async (id) => {
    setMessages((msgs) =>
      msgs.map((m) => (m.id === id ? { ...m, status: 'dismissed' } : m))
    );
    try {
      await feed.dismiss(id);
    } catch {
      // Keep optimistic state
    }
  };

  const visibleMessages = messages.filter((m) => m.status !== 'dismissed');

  return (
    <div className="px-5 pb-5">
      <DigestCard digest={digestData} />

      <div className="font-serif text-lg font-semibold mb-1 text-hearth-dark">
        Agent Inbox
      </div>
      <div className="text-xs text-hearth-muted mb-4">
        Parsed from your connected sources
      </div>

      {loading && visibleMessages.length === 0 && (
        <div className="text-center py-10 text-hearth-muted">
          <div className="text-4xl mb-3">\u23F3</div>
          <div className="text-sm">Loading messages...</div>
        </div>
      )}

      {visibleMessages.map((msg) => (
        <MessageCard
          key={msg.id}
          item={msg}
          onConfirm={handleConfirm}
          onDismiss={handleDismiss}
        />
      ))}

      {!loading && visibleMessages.length === 0 && (
        <div className="text-center py-10 text-hearth-muted">
          <div className="text-4xl mb-3">\u2728</div>
          <div className="text-sm font-medium">All caught up!</div>
          <div className="text-xs mt-1">No messages need your attention right now</div>
        </div>
      )}
    </div>
  );
}
