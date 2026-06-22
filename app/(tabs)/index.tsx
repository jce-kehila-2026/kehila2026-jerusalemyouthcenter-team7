import { JoinRequestsModal } from "@/src/components/JoinRequestsModal";
import {
  CustomAchievement,
  ManageAchievementsModal,
} from "@/src/components/ManageAchievementsModal";
import { ManageAdminsModal } from "@/src/components/ManageAdminsModal";
import { NotificationBell } from "@/src/components/NotificationBell";
import { useAuth } from "@/src/context/AuthContext";
import { leaderboardService, LeaderboardEntry } from "@/src/data/leaderboardService";
import { FirestoreMsg, messageService } from "@/src/data/messageService";
import { notificationService } from "@/src/data/notificationService";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ── Design tokens ─────────────────────────────────────────────────────────────
const TEAL = "#039899";
const RED = "#c56451";
const AMBER = "#cfad5d";
const DARK = "#1a1a2e";
const SUB = "#5a6a7a";
const MUTED = "#9aa8b4";
const BORDER = "#e8eef2";
const BG = "#f5fafe";

// ── Weekly attendance mock data (replace with real Firestore query if needed) ─
const WEEKLY = [
  { day: "Sun", pct: 35 },
  { day: "Mon", pct: 85 },
  { day: "Tue", pct: 70 },
  { day: "Wed", pct: 90 },
  { day: "Thu", pct: 45 },
  { day: "Fri", pct: 95 },
  { day: "Sat", pct: 40 },
];
const AVG_PCT = 82;
const BAR_MAX = 72; // px — tallest possible bar

// ── Types ──────────────────────────────────────────────────────────────────────
type DashEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  registered?: number;
  capacity?: number;
};
type DashNotif = {
  id: string | number;
  title: string;
  body: string;
  timestamp: string;
  is_read: boolean;
  type: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysUntil(dateStr: string) {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

function todayString() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[st.card, style]}>{children}</View>;
}

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <View style={st.secHeader}>
      <Text style={st.secTitle}>{title}</Text>
      <Pressable onPress={onAction} hitSlop={10}>
        <Text style={st.secAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

function WeeklyChart() {
  const low = Math.min(...WEEKLY.map((d) => d.pct));
  const high = Math.max(...WEEKLY.map((d) => d.pct));

  return (
    <View>
      <View style={st.chartRow}>
        {WEEKLY.map((item) => (
          <View key={item.day} style={st.barCol}>
            <View
              style={[
                st.bar,
                {
                  height: Math.max(6, (item.pct / 100) * BAR_MAX),
                  backgroundColor: item.pct >= AVG_PCT ? TEAL : TEAL + "55",
                },
              ]}
            />
            <Text style={st.barLabel}>{item.day}</Text>
          </View>
        ))}
      </View>
      <View style={st.chartFooter}>
        <Text style={st.chartStat}>
          <Text style={st.chartStatMuted}>Low </Text>
          {low}%
        </Text>
        <Text style={[st.chartStat, { color: TEAL }]}>Avg {AVG_PCT}%</Text>
        <Text style={st.chartStat}>
          <Text style={st.chartStatMuted}>High </Text>
          {high}%
        </Text>
      </View>
    </View>
  );
}

function EventRow({
  event,
  onPress,
}: {
  event: DashEvent;
  onPress: () => void;
}) {
  const d = new Date(event.date);
  const days = daysUntil(event.date);
  const day = d.getDate();
  const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();

  return (
    <Pressable onPress={onPress} style={st.eventRow}>
      <View style={st.eventDate}>
        <Text style={st.eventDay}>{day}</Text>
        <Text style={st.eventMon}>{mon}</Text>
      </View>
      <View style={st.eventDateBar} />
      <View style={{ flex: 1 }}>
        <Text style={st.eventTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={st.eventSub} numberOfLines={1}>
          {event.time ? `${event.time} · ` : ""}
          {event.location}
        </Text>
      </View>
      {days > 0 && (
        <View
          style={[
            st.eventBadge,
            days <= 7
              ? { backgroundColor: TEAL + "18" }
              : { backgroundColor: BORDER },
          ]}
        >
          <Text
            style={[st.eventBadgeText, { color: days <= 7 ? TEAL : MUTED }]}
          >
            {days <= 7 ? `${days} days` : "Upcoming"}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Admin sub-components ──────────────────────────────────────────────────────

function AdminActionItems({
  pendingRequests,
  upcomingThisWeek,
  onGoToRequests,
  onGoToEvents,
}: {
  pendingRequests: number;
  upcomingThisWeek: number;
  onGoToRequests: () => void;
  onGoToEvents: () => void;
}) {
  return (
    <View style={st.adminActionCard}>
      {/* Top colour bar */}
      <View
        style={{
          height: 4,
          backgroundColor: pendingRequests > 0 ? RED : TEAL,
        }}
      />
      {/* Header */}
      <View style={st.adminActionHeader}>
        <Ionicons name="flash" size={16} color={TEAL} />
        <Text style={st.adminActionHeaderText}>Needs Attention</Text>
      </View>

      {/* Row 1 — Join Requests */}
      <Pressable style={st.adminActionRow} onPress={onGoToRequests}>
        <View
          style={[
            st.adminActionIconCircle,
            {
              backgroundColor: pendingRequests > 0 ? RED + "18" : TEAL + "15",
            },
          ]}
        >
          <Ionicons
            name={
              pendingRequests > 0
                ? "person-add-outline"
                : "checkmark-circle-outline"
            }
            size={18}
            color={pendingRequests > 0 ? RED : TEAL}
          />
        </View>
        <View style={st.adminActionTextWrap}>
          <Text
            style={[
              st.adminActionTitle,
              pendingRequests === 0 && { color: TEAL },
            ]}
          >
            {pendingRequests > 0
              ? `${pendingRequests} join request${pendingRequests > 1 ? "s" : ""} pending`
              : "No pending requests"}
          </Text>
          <Text style={st.adminActionSub}>Tap to review and approve</Text>
        </View>
        {pendingRequests > 0 ? (
          <View style={st.adminActionBadge}>
            <Text style={st.adminActionBadgeText}>{pendingRequests}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={14} color={MUTED} />
        )}
      </Pressable>

      {/* Row 2 — This Week's Events */}
      <Pressable style={st.adminActionRow} onPress={onGoToEvents}>
        <View
          style={[st.adminActionIconCircle, { backgroundColor: AMBER + "20" }]}
        >
          <Ionicons name="calendar-outline" size={18} color={AMBER} />
        </View>
        <View style={st.adminActionTextWrap}>
          <Text style={st.adminActionTitle}>
            {upcomingThisWeek > 0
              ? `${upcomingThisWeek} event${upcomingThisWeek !== 1 ? "s" : ""} this week`
              : "No events scheduled this week"}
          </Text>
          <Text style={st.adminActionSub}>Tap to manage events</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={MUTED} />
      </Pressable>
    </View>
  );
}

function AdminKpiGrid({
  singerCount,
  eventCount,
  formCount,
  pendingRequests,
  adminCount,
  achievementCount,
  onSingers,
  onEvents,
  onForms,
  onRequests,
  onAdmins,
  onAchievements,
}: {
  singerCount: number;
  eventCount: number;
  formCount: number;
  pendingRequests: number;
  adminCount: number;
  achievementCount: number;
  onSingers: () => void;
  onEvents: () => void;
  onForms: () => void;
  onRequests: () => void;
  onAdmins: () => void;
  onAchievements: () => void;
}) {
  const cards = [
    {
      value: singerCount,
      label: "Singers",
      icon: "people" as const,
      accent: TEAL,
      sub: "registered",
      onPress: onSingers,
    },
    {
      value: "🏆" as string | number,
      label: "Leaderboard",
      icon: "trophy" as const,
      accent: AMBER,
      sub: "manage & reset",
      onPress: onEvents,
    },
    {
      value: formCount,
      label: "Forms",
      icon: "document-text" as const,
      accent: TEAL,
      sub: "submitted",
      onPress: onForms,
    },
    {
      value: pendingRequests,
      label: "Requests",
      icon: "person-add" as const,
      accent: pendingRequests > 0 ? RED : TEAL,
      sub: pendingRequests > 0 ? "pending" : "all clear",
      onPress: onRequests,
    },
    {
      value: adminCount,
      label: "Admins",
      icon: "shield-checkmark" as const,
      accent: TEAL,
      sub: "managing app",
      onPress: onAdmins,
    },
    {
      value: achievementCount,
      label: "Achievements",
      icon: "trophy" as const,
      accent: AMBER,
      sub: "badges created",
      onPress: onAchievements,
    },
  ];

  return (
    <View style={st.adminKpiGrid}>
      {cards.map((card) => (
        <Pressable
          key={card.label}
          onPress={card.onPress}
          style={[
            st.adminKpiCard,
            {
              shadowColor: card.accent,
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 2,
            },
          ]}
        >
          <View
            style={[st.adminKpiAccentBar, { backgroundColor: card.accent }]}
          />
          <View style={st.adminKpiTopRow}>
            <Text style={[st.adminKpiValue, { color: card.accent }]}>
              {card.value}
            </Text>
            <View
              style={[
                st.adminKpiIconCircle,
                { backgroundColor: card.accent + "15" },
              ]}
            >
              <Ionicons name={card.icon} size={14} color={card.accent} />
            </View>
          </View>
          <Text style={st.adminKpiLabel}>{card.label}</Text>
          <Text style={st.adminKpiSub}>{card.sub}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Singer sub-components ─────────────────────────────────────────────────────

const VOICE_EMOJI: Record<string, string> = {
  soprano: "🎤",
  alto: "🎶",
  tenor: "🎺",
  bass: "🥁",
};

function SingerHeroCard({
  firstName,
  voiceType,
  streak,
  nextEventTitle,
  nextEventDaysAway,
}: {
  firstName: string;
  voiceType: string | null;
  streak: number;
  nextEventTitle: string | null;
  nextEventDaysAway: number | null;
}) {
  const voiceEmoji = voiceType ? (VOICE_EMOJI[voiceType] ?? "🎵") : null;
  const voiceLabel = voiceType
    ? voiceType.charAt(0).toUpperCase() + voiceType.slice(1)
    : null;

  let streakText =
    streak === 0 ? "Start your streak!" : `${streak} rehearsal streak`;
  let nextText = "No upcoming events";
  if (nextEventTitle !== null && nextEventDaysAway !== null) {
    if (nextEventDaysAway === 0) nextText = `Today: ${nextEventTitle}`;
    else if (nextEventDaysAway === 1) nextText = `Tomorrow: ${nextEventTitle}`;
    else nextText = `In ${nextEventDaysAway} days: ${nextEventTitle}`;
  }

  return (
    <View style={st.singerHeroCard}>
      <View style={st.singerHeroRow}>
        <View>
          <Text style={st.singerHeroGreeting}>Welcome back 🎵</Text>
          <Text style={st.singerHeroName}>Hey, {firstName}!</Text>
        </View>
        {voiceEmoji && voiceLabel && (
          <View style={st.singerVoiceBadge}>
            <Text style={st.singerVoiceBadgeText}>
              {voiceEmoji} {voiceLabel}
            </Text>
          </View>
        )}
      </View>
      <View style={st.singerHeroDivider} />
      <View style={st.singerHeroChipsRow}>
        <View style={st.singerHeroChip}>
          <Text style={st.singerHeroChipText}>🔥 {streakText}</Text>
        </View>
        <View style={st.singerHeroChip}>
          <Text style={st.singerHeroChipText} numberOfLines={2}>
            📅 {nextText}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SingerBadgesRow({
  registeredEventCount,
  formCount,
  hasOpenedLibrary,
  customAchievements,
}: {
  registeredEventCount: number;
  formCount: number;
  hasOpenedLibrary: boolean;
  customAchievements: CustomAchievement[];
}) {
  const badges = [
    {
      id: "first_login",
      emoji: "🌟",
      label: "Welcome!",
      sublabel: "Joined the chorus",
      earned: true,
      color: AMBER,
    },
    {
      id: "first_event",
      emoji: "🎉",
      label: "Event Star",
      sublabel: "Register to 1 event",
      earned: registeredEventCount >= 1,
      color: TEAL,
    },
    {
      id: "five_events",
      emoji: "🏆",
      label: "Champion",
      sublabel: "Register to 5 events",
      earned: registeredEventCount >= 5,
      color: AMBER,
    },
    {
      id: "form_filler",
      emoji: "📝",
      label: "Form Filler",
      sublabel: "Submit a form",
      earned: formCount >= 1,
      color: TEAL,
    },
    {
      id: "library_explorer",
      emoji: "🎵",
      label: "Music Lover",
      sublabel: "Open the library",
      earned: hasOpenedLibrary,
      color: RED,
    },
  ];

  return (
    <View style={{ marginBottom: 12 }}>
      <SectionCard style={{ paddingBottom: 4 }}>
        <Text style={st.sectionLabel}>My Achievements</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.singerBadgesScroll}
        >
          {badges.map((badge) => (
            <View
              key={badge.id}
              style={[
                st.singerBadgeCard,
                badge.earned
                  ? {
                      backgroundColor: badge.color + "18",
                      borderWidth: 2,
                      borderColor: badge.color,
                    }
                  : {
                      backgroundColor: "#f0f0f0",
                      borderWidth: 2,
                      borderColor: "#ddd",
                    },
              ]}
            >
              {badge.earned ? (
                <Text style={st.singerBadgeEmoji}>{badge.emoji}</Text>
              ) : (
                <View style={{ opacity: 0.3 }}>
                  <Text style={st.singerBadgeEmoji}>{badge.emoji}</Text>
                </View>
              )}
              <Text
                style={[
                  st.singerBadgeLabel,
                  { color: badge.earned ? badge.color : MUTED },
                ]}
              >
                {badge.label}
              </Text>
              <Text style={st.singerBadgeSub}>{badge.sublabel}</Text>
              {!badge.earned && <Text style={st.singerBadgeLock}>🔒</Text>}
            </View>
          ))}

          {/* Admin-awarded custom achievements */}
          {customAchievements.map((ach) => (
            <View
              key={ach.id}
              style={[
                st.singerBadgeCard,
                {
                  backgroundColor: ach.color + "18",
                  borderWidth: 2,
                  borderColor: ach.color,
                },
              ]}
            >
              <Text style={st.singerBadgeEmoji}>{ach.emoji}</Text>
              <Text style={[st.singerBadgeLabel, { color: ach.color }]}>
                {ach.label}
              </Text>
              <Text style={st.singerBadgeSub}>{ach.sublabel}</Text>
            </View>
          ))}
        </ScrollView>
      </SectionCard>
    </View>
  );
}

// ── Singer smart shortcuts component ─────────────────────────────────────────

function SingerShortcuts({
  firstPendingForm,
  nextUnregisteredEvent,
  latestLibraryFile,
  unreadMessages,
  voiceType,
  latestNotif,
  onPendingForm,
  onNextEvent,
  onLatestFile,
  onMessages,
  onVoiceGroup,
  onLatestNotif,
}: {
  firstPendingForm: { id: string; title: string } | null;
  nextUnregisteredEvent: { id: string | number; title: string } | null;
  latestLibraryFile: { id: string; name: string; ext: string } | null;
  unreadMessages: number;
  voiceType: string | null;
  latestNotif: { id: string | number; title: string; body: string } | null;
  onPendingForm: () => void;
  onNextEvent: () => void;
  onLatestFile: () => void;
  onMessages: () => void;
  onVoiceGroup: () => void;
  onLatestNotif: () => void;
}) {
  const shortcuts = [
    {
      icon: "document-text-outline" as const,
      label: firstPendingForm ? firstPendingForm.title : "No Pending Forms",
      sublabel: firstPendingForm ? "Tap to fill now" : "All caught up ✓",
      onPress: onPendingForm,
      bgColor: TEAL + "15",
      borderColor: TEAL,
      iconColor: TEAL,
      badge: firstPendingForm ? "!" : (null as string | null),
      disabled: !firstPendingForm,
    },
    {
      icon: "calendar-outline" as const,
      label: nextUnregisteredEvent
        ? nextUnregisteredEvent.title
        : "No New Events",
      sublabel: nextUnregisteredEvent ? "Tap to register" : "Check back soon",
      onPress: onNextEvent,
      bgColor: AMBER + "20",
      borderColor: AMBER,
      iconColor: AMBER,
      badge: null as string | null,
      disabled: !nextUnregisteredEvent,
    },
    {
      icon: "musical-notes-outline" as const,
      label: latestLibraryFile ? latestLibraryFile.name : "No Uploads Yet",
      sublabel: latestLibraryFile
        ? `Latest · ${latestLibraryFile.ext}`
        : "Nothing yet",
      onPress: onLatestFile,
      bgColor: RED + "15",
      borderColor: RED,
      iconColor: RED,
      badge: latestLibraryFile ? "NEW" : (null as string | null),
      disabled: !latestLibraryFile,
    },
    {
      icon: "chatbubbles-outline" as const,
      label: unreadMessages > 0 ? `${unreadMessages} Unread` : "Messages",
      sublabel: unreadMessages > 0 ? "Tap to read now" : "No new messages",
      onPress: onMessages,
      bgColor: TEAL + "15",
      borderColor: TEAL,
      iconColor: TEAL,
      badge:
        unreadMessages > 0 ? String(unreadMessages) : (null as string | null),
      disabled: false,
    },
    {
      icon: "people-outline" as const,
      label: voiceType
        ? `${voiceType.charAt(0).toUpperCase() + voiceType.slice(1)} Group`
        : "My Voice Group",
      sublabel: "See your section",
      onPress: onVoiceGroup,
      bgColor: AMBER + "20",
      borderColor: AMBER,
      iconColor: AMBER,
      badge: null as string | null,
      disabled: false,
    },
    {
      icon: "notifications-outline" as const,
      label: latestNotif ? latestNotif.title : "Announcements",
      sublabel: latestNotif
        ? latestNotif.body.slice(0, 35) +
          (latestNotif.body.length > 35 ? "…" : "")
        : "Nothing new",
      onPress: onLatestNotif,
      bgColor: RED + "15",
      borderColor: RED,
      iconColor: RED,
      badge: null as string | null,
      disabled: !latestNotif,
    },
  ];

  return (
    <>
      <Text style={st.sectionLabel}>Quick Access</Text>
      <View style={st.shortcutsGrid}>
        {shortcuts.map((s, i) => (
          <Pressable
            key={i}
            style={[
              st.shortcutCard,
              {
                backgroundColor: s.bgColor,
                borderColor: s.borderColor,
                opacity: s.disabled ? 0.5 : 1,
              },
            ]}
            onPress={s.disabled ? undefined : s.onPress}
          >
            <View style={st.shortcutTop}>
              <View
                style={[
                  st.shortcutIconCircle,
                  { backgroundColor: s.iconColor + "20" },
                ]}
              >
                <Ionicons name={s.icon} size={22} color={s.iconColor} />
              </View>
              {s.badge && (
                <View
                  style={[st.shortcutBadge, { backgroundColor: s.borderColor }]}
                >
                  <Text style={st.shortcutBadgeText}>{s.badge}</Text>
                </View>
              )}
            </View>
            <View>
              <Text style={st.shortcutLabel} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={st.shortcutSub} numberOfLines={1}>
                {s.sublabel}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </>
  );
}

// ── Singer leaderboard component ──────────────────────────────────────────────

function SingerLeaderboard({
  leaderboard,
  myUid,
  myPoints,
  myRank,
}: {
  leaderboard: {
    uid: string;
    name: string;
    voice_type: string;
    points: number;
  }[];
  myUid: string;
  myPoints: number;
  myRank: number | null;
}) {
  const podiumEmojis = ["🥇", "🥈", "🥉"];
  const voiceEmoji: Record<string, string> = {
    soprano: "🎤",
    alto: "🎶",
    tenor: "🎺",
    bass: "🥁",
  };
  const top3 = leaderboard.slice(0, 3);
  const isInTop3 = myRank !== null && myRank <= 3;

  return (
    <>
      <Text style={st.sectionLabel}>🏅 Weekly Leaderboard</Text>
      <View style={st.lbCard}>
        <View style={st.lbHeader}>
          <Ionicons name="trophy" size={16} color={AMBER} />
          <Text style={st.lbHeaderText}>Top Singers This Week</Text>
          <Text style={st.lbHeaderSub}>Resets every Monday</Text>
        </View>

        {top3.length === 0 ? (
          <View style={st.lbEmpty}>
            <Text style={st.lbEmptyText}>
              🎵 No rankings yet — be the first!
            </Text>
          </View>
        ) : (
          top3.map((entry, i) => (
            <View
              key={entry.uid}
              style={[
                st.lbRow,
                entry.uid === myUid && st.lbRowHighlight,
                i === 0 && st.lbRowFirst,
              ]}
            >
              <Text style={st.lbPodium}>{podiumEmojis[i]}</Text>
              <View style={st.lbAvatar}>
                <Text style={st.lbAvatarText}>
                  {entry.name?.charAt(0)?.toUpperCase() ?? "?"}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={st.lbName} numberOfLines={1}>
                  {entry.uid === myUid ? "You 🌟" : entry.name}
                </Text>
                <Text style={st.lbVoice}>
                  {voiceEmoji[entry.voice_type?.toLowerCase()] ?? "🎵"}{" "}
                  {entry.voice_type ?? ""}
                </Text>
              </View>
              <View style={st.lbPointsBadge}>
                <Text style={st.lbPointsText}>{entry.points ?? 0}</Text>
                <Text style={st.lbPointsLabel}>pts</Text>
              </View>
            </View>
          ))
        )}

        {!isInTop3 && (
          <>
            <View style={st.lbDivider} />
            <View style={[st.lbRow, st.lbRowHighlight]}>
              <Text style={st.lbPodium}>#{myRank ?? "?"}</Text>
              <View
                style={[
                  st.lbAvatar,
                  { backgroundColor: TEAL + "30", borderColor: TEAL },
                ]}
              >
                <Text style={[st.lbAvatarText, { color: TEAL }]}>You</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={st.lbName}>Your Ranking</Text>
                <Text style={st.lbVoice}>Keep going! 💪</Text>
              </View>
              <View
                style={[
                  st.lbPointsBadge,
                  { backgroundColor: TEAL + "18", borderColor: TEAL },
                ]}
              >
                <Text style={[st.lbPointsText, { color: TEAL }]}>
                  {myPoints}
                </Text>
                <Text style={[st.lbPointsLabel, { color: TEAL }]}>pts</Text>
              </View>
            </View>
          </>
        )}

        <View style={st.lbHowTo}>
          <Text style={st.lbHowToTitle}>How to earn points:</Text>
          <Text style={st.lbHowToRow}>✅ Register for event +10 pts</Text>
          <Text style={st.lbHowToRow}>📝 Submit a form +5 pts</Text>
          <Text style={st.lbHowToRow}>🎵 Open library file +5 pts</Text>
          <Text style={st.lbHowToRow}>🔥 Attendance streak +15 pts</Text>
        </View>
      </View>
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [singerCount, setSingerCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [achievementCount, setAchievementCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [eventList, setEventList] = useState<DashEvent[]>([]);
  const [notifList, setNotifList] = useState<DashNotif[]>([]);
  const [myEventIds, setMyEventIds] = useState<string[]>([]);
  const [manageAdminsOpen, setManageAdminsOpen] = useState(false);
  const [joinRequestsOpen, setJoinRequestsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [formCount, setFormCount] = useState(0);
  const [hasOpenedLibrary, setHasOpenedLibrary] = useState(false);
  const [singerStreak, setSingerStreak] = useState(0);
  const [customAchievements, setCustomAchievements] = useState<
    CustomAchievement[]
  >([]);
  const [singerForms, setSingerForms] = useState<
    { id: string; title: string; status: string }[]
  >([]);
  const [latestLibraryFile, setLatestLibraryFile] = useState<{
    id: string;
    name: string;
    ext: string;
  } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myPoints, setMyPoints] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);

  const now = new Date();
  const upcomingEvents = eventList
    .filter((e) => new Date(e.date) >= now)
    .sort((a, b) => a.date.localeCompare(b.date));

  const unreadNotifs = notifList.filter((n) => !n.is_read).length;
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingThisWeek = upcomingEvents.filter(
    (e) => new Date(e.date) <= weekFromNow,
  ).length;
  const pendingRequestCount = requestCount;

  // ── Data fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        const results = await Promise.allSettled([
          getDocs(
            query(collection(db, "users"), where("role", "==", "singer")),
          ),
          getDocs(query(collection(db, "users"), where("role", "==", "admin"))),
          getDocs(
            query(collection(db, "users"), where("role", "==", "join-request")),
          ),
          getDocs(collection(db, "events")),
          getDocs(collection(db, "event_students")),
        ]);

        const [singers, admins, requests, events, es] = results;

        if (singers.status === "fulfilled") setSingerCount(singers.value.size);
        if (admins.status === "fulfilled") setAdminCount(admins.value.size);
        if (requests.status === "fulfilled")
          setRequestCount(requests.value.size);

        let fetchedEvents: DashEvent[] = [];
        if (events.status === "fulfilled") {
          fetchedEvents = events.value.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<DashEvent, "id">),
          }));
          setEventList(fetchedEvents);
        }

        if (es.status === "fulfilled") {
          const ids = es.value.docs
            .filter((d) => d.data().student_id === user.uid)
            .map((d) => String(d.data().event_id));
          setMyEventIds(ids);
        }

        // ── Admin-specific: count achievement definitions ────────────
        if (isAdmin) {
          getDocs(collection(db, "achievements"))
            .then((snap) => setAchievementCount(snap.size))
            .catch(() => {});
        }

        // ── Singer-specific achievement data ────────────────────────
        if (!isAdmin) {
          const [formSubs, userDoc, attDocs, formsSnap, libSnap] =
            await Promise.allSettled([
              getDocs(
                query(
                  collection(db, "form_submissions"),
                  where("student_id", "==", user.uid),
                ),
              ),
              getDoc(doc(db, "users", user.uid)),
              getDocs(collection(db, "attendance")),
              getDocs(collection(db, "forms")),
              getDocs(
                query(
                  collection(db, "library"),
                  orderBy("uploadedAt", "desc"),
                  limit(1),
                ),
              ),
            ]);

          if (formSubs.status === "fulfilled") {
            setFormCount(formSubs.value.size);
          }

          if (userDoc.status === "fulfilled" && userDoc.value.exists()) {
            const udata = userDoc.value.data() as any;
            setHasOpenedLibrary(!!udata?.has_opened_library);

            // Load admin-awarded custom achievements
            const awardedIds: string[] = udata?.awarded_achievements ?? [];
            if (awardedIds.length > 0) {
              const achSnap = await getDocs(collection(db, "achievements"));
              const allAch: CustomAchievement[] = achSnap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<CustomAchievement, "id">),
              }));
              setCustomAchievements(
                allAch.filter((a) => awardedIds.includes(a.id)),
              );
            }
          }

          if (attDocs.status === "fulfilled") {
            // Build a set of event IDs where this singer was present
            const attendedSet = new Set<string>();
            attDocs.value.docs.forEach((d) => {
              const records = d.data().records as
                | Record<string, string>
                | undefined;
              const status = records?.[user.uid];
              if (status && status !== "absent") attendedSet.add(d.id);
            });

            // Count consecutive attended events going backward from most recent
            const now2 = new Date();
            const pastEvents = fetchedEvents
              .filter((e) => new Date(e.date) < now2)
              .sort((a, b) => b.date.localeCompare(a.date));

            let streak = 0;
            for (const e of pastEvents) {
              if (attendedSet.has(e.id)) streak++;
              else break;
            }
            setSingerStreak(streak);
          }

          // ── Singer forms (pending vs submitted) ──────────────────
          if (
            formSubs.status === "fulfilled" &&
            formsSnap.status === "fulfilled"
          ) {
            const submittedIds = new Set(
              formSubs.value.docs.map((d) => d.data().form_id as string),
            );
            const forms = formsSnap.value.docs.map((d) => ({
              id: d.id,
              title: (d.data() as any).title ?? "Form",
              status: submittedIds.has(d.id) ? "submitted" : "pending",
            }));
            setSingerForms(forms);
          }

          // ── Latest library file ──────────────────────────────────
          if (libSnap.status === "fulfilled" && libSnap.value.size > 0) {
            const d = libSnap.value.docs[0];
            const data = d.data() as any;
            setLatestLibraryFile({
              id: d.id,
              name: data.name ?? data.title ?? "Latest Upload",
              ext: (data.ext ?? data.type ?? "FILE").toUpperCase(),
            });
          }

        }
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetch();

    const unsubNotif = notificationService.subscribe(
      (ns) => setNotifList(ns),
      user.uid,
      isAdmin ? "admin" : "singer",
    );

    const unsubMsg = messageService.subscribe((msgs: FirestoreMsg[]) => {
      setUnreadMessages(
        msgs.filter((m) => m.receiver_id === user.uid && !m.is_read).length,
      );
    });

    return () => {
      unsubNotif();
      unsubMsg();
    };
  }, [user?.uid]);

  // Live leaderboard subscription — singer only
  useEffect(() => {
    if (!user?.uid || user?.role !== "singer") return;
    const unsub = leaderboardService.subscribe((entries) => {
      setLeaderboard(entries);
      const rank = entries.findIndex((e) => e.uid === user.uid);
      setMyRank(rank >= 0 ? rank + 1 : null);
      const myEntry = entries.find((e) => e.uid === user.uid);
      setMyPoints(myEntry?.points ?? 0);
    });
    return unsub;
  }, [user?.uid, user?.role]);

  // ── Live sync: singer's awarded achievements update in real time ──────────
  useEffect(() => {
    if (!user || isAdmin) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), async (snap) => {
      if (!snap.exists()) return;
      const udata = snap.data() as any;
      setHasOpenedLibrary(!!udata?.has_opened_library);

      const awardedIds: string[] = udata?.awarded_achievements ?? [];
      if (awardedIds.length === 0) {
        setCustomAchievements([]);
        return;
      }
      try {
        const achSnap = await getDocs(collection(db, "achievements"));
        const allAch: CustomAchievement[] = achSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CustomAchievement, "id">),
        }));
        setCustomAchievements(allAch.filter((a) => awardedIds.includes(a.id)));
      } catch (e) {
        console.error("Live achievements sync error:", e);
      }
    });

    return () => unsubUser();
  }, [user?.uid, isAdmin]);

  if (loading) {
    return (
      <View
        style={[st.screen, { justifyContent: "center", alignItems: "center" }]}
      >
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ADMIN VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (isAdmin) {
    return (
      <View style={st.screen}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Quick-access icon row ────────────────────────────────── */}
          <View style={st.dashActionsBar}>
            <View style={st.dashGreeting}>
              <Text style={st.dashWelcome}>Welcome back</Text>
              <Text style={st.dashName}>{user?.full_name ?? "Admin"}</Text>
              <Text style={st.dashDate}>{todayString()}</Text>
            </View>
            <View style={st.dashIcons}>
              <Pressable
                onPress={() => router.push("/(tabs)/messages" as any)}
                style={st.dashIconBtn}
                hitSlop={8}
              >
                <Ionicons name="chatbubbles-outline" size={22} color={TEAL} />
              </Pressable>
              <NotificationBell
                unreadCount={unreadNotifs}
                color={TEAL}
                onPress={() => router.push("/(tabs)/notifications" as any)}
              />
              <Pressable onPress={() => router.push("/profile" as any)}>
                <View style={st.avatar}>
                  <Text style={st.avatarText}>
                    {user?.full_name?.charAt(0) ?? "A"}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* ── Section 1: Action Items ──────────────────────────────── */}
          <AdminActionItems
            pendingRequests={pendingRequestCount}
            upcomingThisWeek={upcomingThisWeek}
            onGoToRequests={() => setJoinRequestsOpen(true)}
            onGoToEvents={() => router.push("/(tabs)/events" as any)}
          />

          {/* ── Section 2: KPI Grid ──────────────────────────────────── */}
          <Text style={[st.sectionLabel, { marginBottom: 8 }]}>Overview</Text>
          <AdminKpiGrid
            singerCount={singerCount}
            eventCount={eventList.length}
            formCount={formCount}
            pendingRequests={pendingRequestCount}
            adminCount={adminCount}
            achievementCount={achievementCount}
            onSingers={() => router.push("/(tabs)/students" as any)}
            onEvents={() => router.push("/manage-leaderboard" as any)}
            onForms={() => router.push("/(tabs)/forms" as any)}
            onRequests={() => setJoinRequestsOpen(true)}
            onAdmins={() => setManageAdminsOpen(true)}
            onAchievements={() => setAchievementsOpen(true)}
          />

          {/* ── Section 3: Quick Actions ─────────────────────────────── */}
          <Text style={[st.sectionLabel, { marginBottom: 8 }]}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <Pressable
              style={st.adminQuickBtn}
              onPress={() => router.push("/(tabs)/events?action=add" as any)}
            >
              <View
                style={[st.adminQuickIcon, { backgroundColor: TEAL + "15" }]}
              >
                <Ionicons name="calendar-outline" size={22} color={TEAL} />
              </View>
              <Text style={st.adminQuickLabel}>{"New\nEvent"}</Text>
            </Pressable>

            <Pressable
              style={st.adminQuickBtn}
              onPress={() =>
                router.push("/(tabs)/library?action=upload" as any)
              }
            >
              <View
                style={[st.adminQuickIcon, { backgroundColor: AMBER + "20" }]}
              >
                <Ionicons
                  name="musical-notes-outline"
                  size={22}
                  color={AMBER}
                />
              </View>
              <Text style={st.adminQuickLabel}>{"Upload\nMusic"}</Text>
            </Pressable>

            <Pressable
              style={st.adminQuickBtn}
              onPress={() => router.push("/statistics" as any)}
            >
              <View
                style={[st.adminQuickIcon, { backgroundColor: TEAL + "15" }]}
              >
                <Ionicons name="bar-chart-outline" size={22} color={TEAL} />
              </View>
              <Text style={st.adminQuickLabel}>{"Full\nStats"}</Text>
            </Pressable>
          </View>

          {/* ── Section 4: Weekly Attendance (stats banner) ──────────── */}
          <SectionCard>
            <SectionHeader
              title="Weekly Attendance"
              action="Full stats →"
              onAction={() => router.push("/statistics" as any)}
            />
            <WeeklyChart />
          </SectionCard>

          {/* ── Section 5: Upcoming Events ───────────────────────────── */}
          <SectionCard>
            <SectionHeader
              title="Upcoming Events"
              action="View all →"
              onAction={() => router.push("/(tabs)/events" as any)}
            />
            {upcomingEvents.length === 0 ? (
              <View style={st.emptyInCard}>
                <Ionicons name="calendar-outline" size={36} color={MUTED} />
                <Text style={st.emptyText}>No upcoming events</Text>
              </View>
            ) : (
              upcomingEvents.slice(0, 3).map((e, i) => (
                <View key={e.id}>
                  {i > 0 && <View style={st.rowDivider} />}
                  <EventRow
                    event={e}
                    onPress={() => router.push(`/event/${e.id}` as any)}
                  />
                </View>
              ))
            )}
          </SectionCard>

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* ── Manage Admins Modal ──────────────────────────────────── */}
        <ManageAdminsModal
          visible={manageAdminsOpen}
          onClose={() => setManageAdminsOpen(false)}
        />

        {/* ── Join Requests Modal ───────────────────────────────────── */}
        <JoinRequestsModal
          visible={joinRequestsOpen}
          onClose={() => setJoinRequestsOpen(false)}
        />

        {/* ── Achievement Studio Modal ──────────────────────────────── */}
        <ManageAchievementsModal
          visible={achievementsOpen}
          onClose={() => setAchievementsOpen(false)}
        />
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SINGER VIEW
  // ══════════════════════════════════════════════════════════════════════════
  // Filter events to only those relevant to the singer's year/group
  const studentYear = user?.current_year_id ?? 1;
  const singerUpcomingEvents = upcomingEvents.filter(
    (e) =>
      (e as any).group === "all" ||
      (e as any).group_name === "All Groups" ||
      (e as any).group === `year${studentYear}` ||
      (e as any).group_name === `Year ${studentYear}` ||
      (e as any).groupLabel === "All Groups" ||
      (e as any).groupLabel === `Year ${studentYear}`,
  );

  const nextSingerEvent = singerUpcomingEvents[0] ?? null;
  const nextEventDaysAway = nextSingerEvent
    ? Math.max(
        0,
        Math.floor(
          (new Date(nextSingerEvent.date).getTime() - now.getTime()) / 86400000,
        ),
      )
    : null;
  const firstPendingForm =
    singerForms.find((f) => f.status === "pending") ?? null;
  const nextUnregisteredEvent =
    singerUpcomingEvents.find((e) => !myEventIds.includes(e.id)) ?? null;
  const latestNotifItem = notifList[0] ?? null;
  const myUpcomingEvents = singerUpcomingEvents.filter((e) =>
    myEventIds.includes(e.id),
  );

  return (
    <View style={st.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Singer icon row ──────────────────────────────────────────── */}
        <View style={st.singerActionsBar}>
          <Pressable
            onPress={() => router.push("/(tabs)/messages" as any)}
            style={st.dashIconBtn}
            hitSlop={8}
          >
            <Ionicons name="chatbubbles-outline" size={22} color={TEAL} />
          </Pressable>
          <NotificationBell
            unreadCount={unreadNotifs}
            color={TEAL}
            onPress={() => router.push("/(tabs)/notifications" as any)}
          />
          <Pressable onPress={() => router.push("/profile" as any)}>
            <View style={st.avatar}>
              <Text style={st.avatarText}>
                {user?.full_name?.charAt(0) ?? "S"}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ── A: Hero Welcome Card ───────────────────────────────────── */}
        <SingerHeroCard
          firstName={firstName}
          voiceType={user?.voice_type ?? null}
          streak={singerStreak}
          nextEventTitle={nextSingerEvent?.title ?? null}
          nextEventDaysAway={nextEventDaysAway}
        />

        {/* ── B: Weekly Leaderboard ──────────────────────────────────── */}
        <SingerLeaderboard
          leaderboard={leaderboard}
          myUid={user?.uid ?? ""}
          myPoints={myPoints}
          myRank={myRank}
        />

        {/* ── C: Achievements / Badges Row ───────────────────────────── */}
        <SingerBadgesRow
          registeredEventCount={myEventIds.length}
          formCount={formCount}
          hasOpenedLibrary={hasOpenedLibrary}
          customAchievements={customAchievements}
        />

        {/* ── D: 6 Smart Shortcuts ───────────────────────────────────── */}
        <SingerShortcuts
          firstPendingForm={firstPendingForm}
          nextUnregisteredEvent={nextUnregisteredEvent}
          latestLibraryFile={latestLibraryFile}
          unreadMessages={unreadMessages}
          voiceType={user?.voice_type ?? null}
          latestNotif={latestNotifItem}
          onPendingForm={() =>
            firstPendingForm &&
            router.push(`/form/${firstPendingForm.id}` as any)
          }
          onNextEvent={() =>
            nextUnregisteredEvent &&
            router.push(`/event/${nextUnregisteredEvent.id}` as any)
          }
          onLatestFile={() => router.push("/(tabs)/library" as any)}
          onMessages={() => router.push("/(tabs)/messages" as any)}
          onVoiceGroup={() => router.push("/(tabs)/students" as any)}
          onLatestNotif={() => router.push("/(tabs)/notifications" as any)}
        />

        {/* ── E: My Upcoming Events ──────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            title="My Upcoming Events"
            action="View all →"
            onAction={() => router.push("/(tabs)/events" as any)}
          />
          {myUpcomingEvents.length === 0 ? (
            <View style={st.emptyInCard}>
              <Ionicons name="calendar-outline" size={36} color={MUTED} />
              <Text style={st.emptyText}>No registered events yet</Text>
            </View>
          ) : (
            myUpcomingEvents.slice(0, 3).map((e, i) => (
              <View key={e.id}>
                {i > 0 && <View style={st.rowDivider} />}
                <EventRow
                  event={e}
                  onPress={() => router.push(`/event/${e.id}` as any)}
                />
              </View>
            ))
          )}
        </SectionCard>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // ── Header
  header: {
    backgroundColor: TEAL,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerAppName: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIconBtn: { position: "relative", padding: 4 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  headerWelcome: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "500",
  },
  headerTitle: { color: "#fff", fontSize: 34, fontWeight: "900", marginTop: 2 },
  headerDate: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 3 },

  // ── Scroll content
  scroll: { padding: 14, paddingTop: 16 },

  // ── Dashboard body action bar (replaces removed admin header)
  dashActionsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  dashGreeting: { flex: 1 },
  dashWelcome: { fontSize: 12, color: MUTED, fontWeight: "500" },
  dashName: { fontSize: 20, fontWeight: "800", color: DARK, marginTop: 2 },
  dashDate: { fontSize: 11, color: MUTED, marginTop: 2 },
  dashIcons: { flexDirection: "row", alignItems: "center", gap: 8 },
  dashIconBtn: { padding: 4 },
  singerActionsBar: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
  },

  // ── Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  // ── Section header
  secHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  secTitle: { fontSize: 16, fontWeight: "800", color: DARK },
  secAction: { fontSize: 13, fontWeight: "700", color: TEAL },

  // ── Attendance
  attLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
    letterSpacing: 1,
    marginBottom: 8,
  },
  attRow: { flexDirection: "row", alignItems: "flex-start", gap: 2 },
  attNumber: { fontSize: 64, fontWeight: "900", color: TEAL, lineHeight: 70 },
  attPercent: { fontSize: 28, fontWeight: "700", color: TEAL, marginTop: 12 },
  attSub: { fontSize: 13, color: MUTED, marginTop: 4, marginBottom: 12 },
  progressTrack: {
    height: 8,
    backgroundColor: BORDER,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: { height: 8, backgroundColor: TEAL, borderRadius: 4 },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 16 },

  // ── Stats row
  statsRow: { flexDirection: "row" },
  statBox: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: "flex-start",
  },
  statBoxBorder: { borderRightWidth: 1, borderRightColor: BORDER },
  statIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 2,
  },
  statValue: { fontSize: 26, fontWeight: "900" },
  statLabel: { fontSize: 11, fontWeight: "600", color: DARK },
  statSub: { fontSize: 10, fontWeight: "600" },

  // ── Bar chart
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: BAR_MAX + 20,
    gap: 4,
    marginBottom: 12,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: BAR_MAX + 20,
  },
  bar: { width: "70%", borderRadius: 4 },
  barLabel: { fontSize: 9, fontWeight: "600", color: MUTED, marginTop: 5 },
  chartFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
  },
  chartStat: { fontSize: 12, fontWeight: "700", color: SUB },
  chartStatMuted: { fontWeight: "400", color: MUTED },

  // ── Event row
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  eventDate: { alignItems: "center", minWidth: 36 },
  eventDay: { fontSize: 22, fontWeight: "900", color: TEAL, lineHeight: 24 },
  eventMon: { fontSize: 9, fontWeight: "700", color: TEAL, letterSpacing: 0.5 },
  eventDateBar: {
    width: 2,
    height: 36,
    backgroundColor: AMBER,
    borderRadius: 1,
  },
  eventTitle: { fontSize: 14, fontWeight: "700", color: DARK, marginBottom: 3 },
  eventSub: { fontSize: 12, color: SUB },
  eventBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  eventBadgeText: { fontSize: 11, fontWeight: "700" },

  // ── Activity item
  actRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  actDot: { width: 10, height: 10, borderRadius: 5 },
  actTitle: { fontSize: 14, fontWeight: "600", color: DARK, marginBottom: 2 },
  actTime: { fontSize: 12, color: MUTED },
  actCheck: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: BORDER,
  },

  // ── Row divider
  rowDivider: { height: 1, backgroundColor: BORDER },

  // ── Empty states
  emptyInCard: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, color: MUTED },
  emptyBtn: {
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: TEAL,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "700", color: TEAL },

  // ── Admin Action Items card
  adminActionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden" as const,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  adminActionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    padding: 14,
    paddingBottom: 10,
  },
  adminActionHeaderText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: DARK,
  },
  adminActionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  adminActionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  adminActionTextWrap: { flex: 1, marginLeft: 12 },
  adminActionTitle: { fontSize: 13, fontWeight: "700" as const, color: DARK },
  adminActionSub: { fontSize: 11, color: SUB, marginTop: 1 },
  adminActionBadge: {
    backgroundColor: RED,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  adminActionBadgeText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#fff",
  },

  // ── Admin KPI grid
  adminKpiGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 12,
  },
  adminKpiCard: {
    width: "31%" as any,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    minHeight: 90,
    overflow: "hidden" as const,
  },
  adminKpiTopRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
  },
  adminKpiValue: { fontSize: 26, fontWeight: "900" as const },
  adminKpiIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  adminKpiLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: DARK,
    marginTop: 6,
  },
  adminKpiSub: { fontSize: 10, color: SUB, marginTop: 2 },
  adminKpiAccentBar: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  // ── Admin Quick Actions
  adminQuickBtn: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "#ffffff",
    gap: 6,
  },
  adminQuickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  adminQuickLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: DARK,
    textAlign: "center" as const,
    lineHeight: 13,
  },

  // ── Admin achievement widget
  achWidgetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  achWidgetIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: AMBER + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  achWidgetSub: { fontSize: 12, color: MUTED, marginTop: 2 },
  achWidgetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: TEAL + "15",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  achWidgetBtnText: { fontSize: 13, fontWeight: "700", color: TEAL },

  // ── Singer icon bar
  singerIconBar: {
    backgroundColor: TEAL,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    alignItems: "center" as const,
    gap: 8,
  },

  // ── Section label (singer sections)
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: MUTED,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },

  // ── Singer Hero Card
  singerHeroCard: {
    backgroundColor: TEAL,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  singerHeroRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
  },
  singerHeroGreeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600" as const,
  },
  singerHeroName: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: "#fff",
    marginTop: 2,
  },
  singerVoiceBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center" as const,
  },
  singerVoiceBadgeText: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: "#fff",
  },
  singerHeroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 14,
  },
  singerHeroChipsRow: { flexDirection: "row" as const, gap: 12 },
  singerHeroChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    flex: 1,
  },
  singerHeroChipText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700" as const,
    flexShrink: 1,
  },

  // ── Singer Badges Row
  singerBadgesScroll: { paddingBottom: 8 },
  singerBadgeCard: {
    width: 100,
    marginRight: 10,
    borderRadius: 16,
    padding: 12,
    alignItems: "center" as const,
    gap: 4,
  },
  singerBadgeEmoji: { fontSize: 28 },
  singerBadgeLabel: {
    fontSize: 11,
    fontWeight: "800" as const,
    textAlign: "center" as const,
  },
  singerBadgeSub: { fontSize: 9, color: MUTED, textAlign: "center" as const },
  singerBadgeLock: { fontSize: 10 },

  // ── Singer Quick Grid
  singerQuickGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
    marginBottom: 4,
  },
  singerQuickCard: {
    width: "47%" as any,
    borderRadius: 18,
    padding: 14,
    minHeight: 90,
    justifyContent: "space-between" as const,
  },
  singerQuickIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  singerQuickBadge: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: RED,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  singerQuickBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800" as const,
  },
  singerQuickLabel: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: DARK,
    marginTop: 8,
  },
  singerQuickSub: { fontSize: 10, color: SUB, marginTop: 2 },

  // ── Quick links (singer)
  quickLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: "45%",
    borderWidth: 1.5,
    borderColor: TEAL + "44",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: TEAL + "08",
  },
  quickLinkText: { fontSize: 13, fontWeight: "700", color: TEAL },

  // ── Singer Shortcuts Grid
  shortcutsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 12,
  },
  shortcutCard: {
    width: "47%" as any,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    minHeight: 90,
    justifyContent: "space-between" as const,
  },
  shortcutTop: {
    position: "relative" as const,
    alignSelf: "flex-start" as const,
  },
  shortcutIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  shortcutBadge: {
    position: "absolute" as const,
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
  },
  shortcutBadgeText: { fontSize: 9, fontWeight: "900" as const, color: "#fff" },
  shortcutLabel: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: DARK,
    marginTop: 8,
  },
  shortcutSub: { fontSize: 10, color: SUB, marginTop: 2 },

  // ── Leaderboard Card
  lbCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 4,
  },
  lbHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    padding: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  lbHeaderText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: DARK,
    flex: 1,
  },
  lbHeaderSub: { fontSize: 10, color: MUTED },
  lbRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  lbRowFirst: { backgroundColor: AMBER + "08" },
  lbRowHighlight: { backgroundColor: TEAL + "08" },
  lbPodium: { fontSize: 18, width: 28, textAlign: "center" as const },
  lbAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AMBER + "30",
    borderWidth: 1.5,
    borderColor: AMBER,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  lbAvatarText: { fontSize: 14, fontWeight: "800" as const, color: AMBER },
  lbName: { fontSize: 13, fontWeight: "700" as const, color: DARK },
  lbVoice: { fontSize: 10, color: SUB, marginTop: 1 },
  lbPointsBadge: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: AMBER + "18",
    borderWidth: 1.5,
    borderColor: AMBER,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lbPointsText: { fontSize: 16, fontWeight: "900" as const, color: AMBER },
  lbPointsLabel: { fontSize: 8, fontWeight: "700" as const, color: AMBER },
  lbDivider: { height: 1, backgroundColor: BORDER, marginHorizontal: 14 },
  lbEmpty: { padding: 20, alignItems: "center" as const },
  lbEmptyText: { fontSize: 13, color: MUTED, fontWeight: "600" as const },
  lbHowTo: {
    padding: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    gap: 3,
  },
  lbHowToTitle: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: SUB,
    marginBottom: 4,
  },
  lbHowToRow: { fontSize: 11, color: MUTED },
});
