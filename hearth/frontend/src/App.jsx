import { useState } from "react";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&display=swap');
`;

// Mock data
const MOCK_MESSAGES = [
  {
    id: 1,
    source: "WhatsApp · Lincoln Elementary Parents",
    sourceIcon: "💬",
    raw: "Hi parents! Picture Day has been moved to March 3rd. Please make sure kids wear solid colors. No logos please!",
    parsed: {
      event: "Picture Day",
      date: "Mon, March 3",
      time: "During school hours",
      notes: "Solid colors, no logos",
      actions: ["Add to calendar", "Set outfit reminder for March 2"]
    },
    confidence: 0.95,
    timestamp: "2 min ago",
    status: "pending"
  },
  {
    id: 2,
    source: "WhatsApp · Soccer Team U8",
    sourceIcon: "💬",
    raw: "Practice canceled Thursday due to rain. Makeup session Saturday 9am same field.",
    parsed: {
      event: "Soccer Practice (Makeup)",
      date: "Sat, March 1",
      time: "9:00 AM",
      location: "Riverside Field",
      notes: "Originally Thu → moved to Sat due to rain",
      actions: ["Remove Thu from calendar", "Add Sat session", "Flag: conflicts with Farmers Market"]
    },
    confidence: 0.88,
    timestamp: "15 min ago",
    status: "pending"
  },
  {
    id: 3,
    source: "Gmail · drsmith@pediatrics.com",
    sourceIcon: "📧",
    raw: "Reminder: Annual checkup for Emma scheduled Feb 28 at 10:30 AM",
    parsed: {
      event: "Emma — Annual Checkup",
      date: "Fri, Feb 28",
      time: "10:30 AM",
      location: "Dr. Smith Pediatrics, 420 Oak Ave",
      notes: "Bring insurance card, vaccination record",
      actions: ["Confirm on calendar", "Assign to parent"]
    },
    confidence: 0.97,
    timestamp: "1 hr ago",
    status: "confirmed"
  },
  {
    id: 4,
    source: "WhatsApp · Lincoln Elementary Parents",
    sourceIcon: "💬",
    raw: "Don't forget — Science Fair projects due next Friday! Kids need a tri-fold board.",
    parsed: {
      event: "Science Fair Deadline",
      date: "Fri, March 7",
      time: "End of school day",
      notes: "Needs tri-fold board",
      actions: ["Add deadline to calendar", "Add 'Buy tri-fold board' to shopping list", "Set reminder for March 5"]
    },
    confidence: 0.92,
    timestamp: "3 hrs ago",
    status: "pending"
  }
];

const MOCK_CALENDAR = [
  { day: "Today · Thu Feb 20", events: [
    { time: "3:15 PM", title: "School Pickup — Emma", owner: "Dad", color: "#4A90D9" },
    { time: "4:30 PM", title: "Soccer Practice", owner: "Dad", color: "#6DBE4A", note: "⚠️ Canceled (rain)" },
    { time: "6:00 PM", title: "Dinner: Chicken stir fry", owner: "Mom", color: "#E8913A" },
  ]},
  { day: "Fri Feb 21", events: [
    { time: "8:00 AM", title: "School Drop-off", owner: "Mom", color: "#4A90D9" },
    { time: "10:00 AM", title: "Mom — Dentist", owner: "Mom", color: "#D94A6B" },
    { time: "3:15 PM", title: "School Pickup — Emma", owner: "Dad", color: "#4A90D9" },
    { time: "5:00 PM", title: "Piano Lesson", owner: "Mom", color: "#9B6DBE" },
  ]},
  { day: "Sat Feb 22", events: [
    { time: "9:00 AM", title: "Farmers Market", owner: "Family", color: "#6DBE4A" },
    { time: "11:00 AM", title: "Emma — Playdate at Sarah's", owner: "Dad", color: "#E8913A" },
  ]},
];

const MOCK_SOURCES = [
  { id: 1, type: "whatsapp", name: "Lincoln Elementary Parents", label: "School", status: "connected", messageCount: 47 },
  { id: 2, type: "whatsapp", name: "Soccer Team U8", label: "Extracurricular", status: "connected", messageCount: 23 },
  { id: 3, type: "whatsapp", name: "Family Group", label: "Family", status: "connected", messageCount: 156 },
  { id: 4, type: "gmail", name: "school@lincoln.edu", label: "School", status: "connected", messageCount: 12 },
  { id: 5, type: "gmail", name: "drsmith@pediatrics.com", label: "Medical", status: "connected", messageCount: 3 },
  { id: 6, type: "gcal", name: "Dad's Calendar", label: "Personal", status: "connected", messageCount: null },
  { id: 7, type: "gcal", name: "Mom's Calendar", label: "Personal", status: "connected", messageCount: null },
  { id: 8, type: "gcal", name: "Family Calendar", label: "Shared", status: "connected", messageCount: null },
];

const AUTONOMY_CATEGORIES = [
  { id: "calendar", label: "Calendar & Scheduling", icon: "📅", level: 2, description: "Adding events, resolving conflicts, sending reminders" },
  { id: "meals", label: "Meal Planning", icon: "🍽️", level: 1, description: "Weekly plans, recipe suggestions, grocery lists" },
  { id: "groceries", label: "Grocery Ordering", icon: "🛒", level: 1, description: "Generating lists, placing orders, reordering staples" },
  { id: "consumables", label: "Household Supplies", icon: "🧻", level: 3, description: "Diapers, wipes, cleaning supplies, toiletries" },
  { id: "medical", label: "Medical & Health", icon: "🏥", level: 1, description: "Appointment scheduling, medication reminders, records" },
  { id: "transport", label: "Rides & Logistics", icon: "🚗", level: 2, description: "Pickup/dropoff coordination, carpool, route planning" },
  { id: "gifts", label: "Birthdays & Gifts", icon: "🎁", level: 1, description: "Tracking birthdays, gift purchasing, RSVPs" },
  { id: "inventory", label: "Kids' Inventory", icon: "👟", level: 1, description: "Shoe sizes, clothing fits, gear condition" },
];

const AUTONOMY_LEVELS = [
  { value: 1, label: "Dashboard", emoji: "👁️", desc: "I see it, you decide" },
  { value: 2, label: "Co-pilot", emoji: "🤝", desc: "I suggest, you approve" },
  { value: 3, label: "Autopilot", emoji: "🚀", desc: "I handle it, you're notified" },
];

const styles = {
  app: {
    fontFamily: "'DM Sans', sans-serif",
    background: "#FDFBF7",
    minHeight: "100vh",
    color: "#2D2A26",
    maxWidth: 480,
    margin: "0 auto",
    position: "relative",
    overflow: "hidden",
  },
  header: {
    padding: "20px 20px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontFamily: "'Fraunces', serif",
    fontSize: 26,
    fontWeight: 600,
    color: "#2D2A26",
    letterSpacing: "-0.5px",
  },
  logoAccent: {
    color: "#D4804A",
  },
  subtitle: {
    fontSize: 12,
    color: "#9B9590",
    fontWeight: 400,
    marginTop: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #D4804A, #E8A66A)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontSize: 14,
    fontWeight: 600,
  },
  nav: {
    display: "flex",
    gap: 4,
    padding: "16px 20px",
    overflowX: "auto",
  },
  navItem: (active) => ({
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
    background: active ? "#2D2A26" : "transparent",
    color: active ? "#FDFBF7" : "#7A7570",
    border: active ? "none" : "1px solid #E8E4DF",
  }),
  section: {
    padding: "0 20px 20px",
  },
  sectionTitle: {
    fontFamily: "'Fraunces', serif",
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 4,
    color: "#2D2A26",
  },
  sectionSub: {
    fontSize: 12,
    color: "#9B9590",
    marginBottom: 16,
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    border: "1px solid #F0ECE6",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  },
  messageCard: (status) => ({
    background: status === "confirmed" ? "#F8FBF6" : "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    border: status === "confirmed" ? "1px solid #C8E0B8" : "1px solid #F0ECE6",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
    transition: "all 0.2s",
  }),
  sourceTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "#9B9590",
    marginBottom: 8,
  },
  rawMessage: {
    fontSize: 13,
    color: "#5A5550",
    lineHeight: 1.5,
    padding: "10px 12px",
    background: "#FAF8F5",
    borderRadius: 10,
    marginBottom: 12,
    borderLeft: "3px solid #E8E4DF",
    fontStyle: "italic",
  },
  parsedSection: {
    marginBottom: 8,
  },
  parsedLabel: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#B5B0AA",
    marginBottom: 4,
  },
  parsedEvent: {
    fontSize: 15,
    fontWeight: 600,
    color: "#2D2A26",
    marginBottom: 2,
  },
  parsedDetail: {
    fontSize: 13,
    color: "#5A5550",
    lineHeight: 1.5,
  },
  confidenceBadge: (conf) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 10,
    background: conf > 0.9 ? "#E8F5E0" : conf > 0.8 ? "#FFF3E0" : "#FFEBEE",
    color: conf > 0.9 ? "#4A8C2A" : conf > 0.8 ? "#E8913A" : "#D94A4A",
  }),
  actionButton: (primary) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 12px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    transition: "all 0.15s",
    background: primary ? "#2D2A26" : "#F5F2ED",
    color: primary ? "#FDFBF7" : "#5A5550",
    marginRight: 6,
    marginTop: 6,
  }),
  calendarDay: {
    marginBottom: 20,
  },
  calendarDayTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#9B9590",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  calendarEvent: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    background: "white",
    borderRadius: 12,
    marginBottom: 6,
    border: "1px solid #F0ECE6",
  },
  calendarTime: {
    fontSize: 12,
    fontWeight: 500,
    color: "#9B9590",
    width: 65,
    flexShrink: 0,
  },
  calendarDot: (color) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  }),
  calendarTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: "#2D2A26",
    flex: 1,
  },
  calendarOwner: {
    fontSize: 11,
    color: "#B5B0AA",
    fontWeight: 500,
  },
  calendarNote: {
    fontSize: 11,
    color: "#D94A4A",
    fontWeight: 500,
  },
  sourceItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    background: "white",
    borderRadius: 12,
    marginBottom: 8,
    border: "1px solid #F0ECE6",
  },
  sourceIcon: (type) => ({
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    background: type === "whatsapp" ? "#E8F5E0" : type === "gmail" ? "#FEE8E8" : "#E0ECFF",
    flexShrink: 0,
  }),
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 13,
    fontWeight: 500,
    color: "#2D2A26",
  },
  sourceLabel: {
    fontSize: 11,
    color: "#9B9590",
  },
  sourceStatus: {
    fontSize: 10,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 8,
    background: "#E8F5E0",
    color: "#4A8C2A",
  },
  autonomyItem: {
    background: "white",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 10,
    border: "1px solid #F0ECE6",
  },
  autonomyHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  autonomyIcon: {
    fontSize: 20,
  },
  autonomyLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#2D2A26",
  },
  autonomyDesc: {
    fontSize: 11,
    color: "#9B9590",
  },
  autonomySlider: {
    display: "flex",
    gap: 0,
    background: "#F5F2ED",
    borderRadius: 10,
    padding: 3,
    marginTop: 4,
  },
  autonomyLevel: (active, value) => ({
    flex: 1,
    padding: "7px 4px",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    background: active
      ? value === 1 ? "#E0ECFF" : value === 2 ? "#FFF3E0" : "#E8F5E0"
      : "transparent",
    color: active
      ? value === 1 ? "#3A6BC5" : value === 2 ? "#D4804A" : "#4A8C2A"
      : "#B5B0AA",
  }),
  addSource: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "14px",
    borderRadius: 12,
    border: "2px dashed #E8E4DF",
    color: "#9B9590",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: 8,
  },
  digest: {
    background: "linear-gradient(135deg, #2D2A26, #4A4540)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    color: "white",
  },
  digestTitle: {
    fontFamily: "'Fraunces', serif",
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 4,
  },
  digestSub: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 14,
  },
  digestStat: {
    display: "flex",
    gap: 12,
    marginBottom: 0,
  },
  digestStatItem: {
    flex: 1,
    background: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "10px 12px",
    textAlign: "center",
  },
  digestStatNumber: {
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "'Fraunces', serif",
  },
  digestStatLabel: {
    fontSize: 10,
    opacity: 0.5,
    marginTop: 2,
  },
  bottomNav: {
    position: "sticky",
    bottom: 0,
    display: "flex",
    justifyContent: "space-around",
    padding: "12px 20px",
    paddingBottom: 20,
    background: "rgba(253,251,247,0.95)",
    backdropFilter: "blur(10px)",
    borderTop: "1px solid #F0ECE6",
  },
  bottomNavItem: (active) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    fontSize: 10,
    fontWeight: active ? 600 : 400,
    color: active ? "#D4804A" : "#B5B0AA",
    cursor: "pointer",
    transition: "all 0.2s",
  }),
  bottomNavIcon: {
    fontSize: 20,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#D4804A",
    color: "white",
    fontSize: 9,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#B5B0AA",
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  confirmOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 100,
  },
  confirmSheet: {
    background: "#FDFBF7",
    borderRadius: "20px 20px 0 0",
    padding: 24,
    maxWidth: 480,
    width: "100%",
    maxHeight: "70vh",
    overflow: "auto",
  },
  statusChip: (status) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 10,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 10,
    background: status === "confirmed" ? "#E8F5E0" : "#FFF3E0",
    color: status === "confirmed" ? "#4A8C2A" : "#D4804A",
  }),
  onboardingOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "linear-gradient(180deg, #FDFBF7 0%, #F5EDDF 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: 40,
    textAlign: "center",
  },
};

function AgentFeed({ messages, onConfirm }) {
  return (
    <div style={styles.section}>
      <div style={styles.digest}>
        <div style={styles.digestTitle}>Good afternoon ☀️</div>
        <div style={styles.digestSub}>Here's what your family has going on</div>
        <div style={styles.digestStat}>
          <div style={styles.digestStatItem}>
            <div style={styles.digestStatNumber}>3</div>
            <div style={styles.digestStatLabel}>Need Review</div>
          </div>
          <div style={styles.digestStatItem}>
            <div style={styles.digestStatNumber}>1</div>
            <div style={styles.digestStatLabel}>Conflict</div>
          </div>
          <div style={styles.digestStatItem}>
            <div style={styles.digestStatNumber}>5</div>
            <div style={styles.digestStatLabel}>Events This Week</div>
          </div>
        </div>
      </div>

      <div style={styles.sectionTitle}>Agent Inbox</div>
      <div style={styles.sectionSub}>Parsed from your connected sources</div>

      {messages.map((msg) => (
        <div key={msg.id} style={styles.messageCard(msg.status)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={styles.sourceTag}>{msg.sourceIcon} {msg.source}</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={styles.confidenceBadge(msg.confidence)}>
                {Math.round(msg.confidence * 100)}% sure
              </span>
              <span style={styles.statusChip(msg.status)}>
                {msg.status === "confirmed" ? "✓ Done" : "⏳ Pending"}
              </span>
            </div>
          </div>

          <div style={styles.rawMessage}>"{msg.raw}"</div>

          <div style={styles.parsedSection}>
            <div style={styles.parsedLabel}>Agent Parsed</div>
            <div style={styles.parsedEvent}>{msg.parsed.event}</div>
            <div style={styles.parsedDetail}>
              📅 {msg.parsed.date} {msg.parsed.time && `· ${msg.parsed.time}`}
              {msg.parsed.location && <><br />📍 {msg.parsed.location}</>}
              {msg.parsed.notes && <><br />📝 {msg.parsed.notes}</>}
            </div>
          </div>

          {msg.status !== "confirmed" && (
            <div style={{ marginTop: 8 }}>
              <div style={styles.parsedLabel}>Suggested Actions</div>
              {msg.parsed.actions.map((action, i) => (
                <button
                  key={i}
                  style={styles.actionButton(i === 0)}
                  onClick={() => onConfirm(msg.id)}
                >
                  {i === 0 ? "✓ " : ""}{action}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CalendarView() {
  return (
    <div style={styles.section}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={styles.sectionTitle}>Family Calendar</div>
          <div style={styles.sectionSub}>Unified view · 3 calendars synced</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontSize: 11, background: "#E0ECFF", color: "#3A6BC5", padding: "4px 8px", borderRadius: 8, fontWeight: 600 }}>Dad</span>
          <span style={{ fontSize: 11, background: "#FEE8E8", color: "#D94A6B", padding: "4px 8px", borderRadius: 8, fontWeight: 600 }}>Mom</span>
        </div>
      </div>

      {MOCK_CALENDAR.map((day, di) => (
        <div key={di} style={styles.calendarDay}>
          <div style={styles.calendarDayTitle}>{day.day}</div>
          {day.events.map((event, ei) => (
            <div key={ei} style={{
              ...styles.calendarEvent,
              opacity: event.note ? 0.5 : 1,
              textDecoration: event.note?.includes("Canceled") ? "none" : "none",
            }}>
              <div style={styles.calendarTime}>{event.time}</div>
              <div style={styles.calendarDot(event.color)} />
              <div style={{ flex: 1 }}>
                <div style={{
                  ...styles.calendarTitle,
                  textDecoration: event.note?.includes("Canceled") ? "line-through" : "none",
                }}>{event.title}</div>
                {event.note && <div style={styles.calendarNote}>{event.note}</div>}
              </div>
              <div style={styles.calendarOwner}>{event.owner}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SourcesView() {
  const grouped = {
    whatsapp: MOCK_SOURCES.filter(s => s.type === "whatsapp"),
    gmail: MOCK_SOURCES.filter(s => s.type === "gmail"),
    gcal: MOCK_SOURCES.filter(s => s.type === "gcal"),
  };

  const iconMap = { whatsapp: "💬", gmail: "📧", gcal: "📅" };
  const labelMap = { whatsapp: "WhatsApp Chats", gmail: "Gmail Senders", gcal: "Google Calendars" };

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Connected Sources</div>
      <div style={styles.sectionSub}>The agent monitors these for family-relevant info</div>

      {Object.entries(grouped).map(([type, sources]) => (
        <div key={type} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#9B9590", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.3px" }}>
            {iconMap[type]} {labelMap[type]}
          </div>
          {sources.map((source) => (
            <div key={source.id} style={styles.sourceItem}>
              <div style={styles.sourceIcon(source.type)}>
                {iconMap[source.type]}
              </div>
              <div style={styles.sourceInfo}>
                <div style={styles.sourceName}>{source.name}</div>
                <div style={styles.sourceLabel}>
                  {source.label}
                  {source.messageCount && ` · ${source.messageCount} messages scanned`}
                </div>
              </div>
              <span style={styles.sourceStatus}>Connected</span>
            </div>
          ))}
          <div style={styles.addSource}>
            + Add {type === "whatsapp" ? "Chat" : type === "gmail" ? "Sender" : "Calendar"}
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsView({ categories, onUpdate }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>Autonomy Settings</div>
      <div style={styles.sectionSub}>Control how much the agent does on its own</div>

      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: 20,
        padding: 12,
        background: "#FAF8F5",
        borderRadius: 12,
      }}>
        {AUTONOMY_LEVELS.map(l => (
          <div key={l.value} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{l.emoji}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#2D2A26" }}>{l.label}</div>
            <div style={{ fontSize: 10, color: "#9B9590", marginTop: 2 }}>{l.desc}</div>
          </div>
        ))}
      </div>

      {categories.map((cat) => (
        <div key={cat.id} style={styles.autonomyItem}>
          <div style={styles.autonomyHeader}>
            <span style={styles.autonomyIcon}>{cat.icon}</span>
            <div>
              <div style={styles.autonomyLabel}>{cat.label}</div>
              <div style={styles.autonomyDesc}>{cat.description}</div>
            </div>
          </div>
          <div style={styles.autonomySlider}>
            {AUTONOMY_LEVELS.map(level => (
              <div
                key={level.value}
                style={styles.autonomyLevel(cat.level === level.value, level.value)}
                onClick={() => onUpdate(cat.id, level.value)}
              >
                {level.emoji} {level.label}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ ...styles.card, marginTop: 20, background: "#FAF8F5", border: "1px solid #E8E4DF" }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>👤 Per-Parent Settings</div>
        <div style={{ fontSize: 12, color: "#7A7570", lineHeight: 1.5 }}>
          Each parent can set their own autonomy preferences. Mom might want Autopilot on groceries while Dad prefers Co-pilot.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <div style={{ flex: 1, padding: "8px 12px", background: "#E0ECFF", borderRadius: 8, textAlign: "center", fontSize: 12, fontWeight: 500, color: "#3A6BC5" }}>
            Dad's Preferences
          </div>
          <div style={{ flex: 1, padding: "8px 12px", background: "#FEE8E8", borderRadius: 8, textAlign: "center", fontSize: 12, fontWeight: 500, color: "#D94A6B" }}>
            Mom's Preferences
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HearthApp() {
  const [activeTab, setActiveTab] = useState("feed");
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [categories, setCategories] = useState(AUTONOMY_CATEGORIES);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleConfirm = (id) => {
    setMessages(msgs => msgs.map(m =>
      m.id === id ? { ...m, status: "confirmed" } : m
    ));
  };

  const handleAutonomyUpdate = (catId, level) => {
    setCategories(cats => cats.map(c =>
      c.id === catId ? { ...c, level } : c
    ));
  };

  const tabs = [
    { id: "feed", label: "Feed", icon: "🏠" },
    { id: "calendar", label: "Calendar", icon: "📅" },
    { id: "sources", label: "Sources", icon: "🔌" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div style={styles.app}>
      <style>{FONTS}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.logo}>
            <span style={styles.logoAccent}>h</span>earth
          </div>
          <div style={styles.subtitle}>your family's second brain</div>
        </div>
        <div style={styles.avatar}>D</div>
      </div>

      {/* Nav */}
      <div style={styles.nav}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            style={styles.navItem(activeTab === tab.id)}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ paddingBottom: 80, minHeight: "60vh" }}>
        {activeTab === "feed" && (
          <AgentFeed messages={messages} onConfirm={handleConfirm} />
        )}
        {activeTab === "calendar" && <CalendarView />}
        {activeTab === "sources" && <SourcesView />}
        {activeTab === "settings" && (
          <SettingsView
            categories={categories}
            onUpdate={handleAutonomyUpdate}
          />
        )}
      </div>
    </div>
  );
}
