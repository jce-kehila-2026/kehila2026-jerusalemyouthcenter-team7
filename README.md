# 🎵 Jerusalem Youth Chorus — Management System

This project is developed for the Jerusalem Youth Center, an organization that works with youth through music. The system is intended to support student management, communication, attendance tracking, and activity monitoring. Built with React Native and Expo Router.

---

## Team Members

| Name             | Role                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rania Shqerat    | Full Stack Developer: Events, Attendance, Calendar & Music Library (UI + Firebase Integration)                                                                       |
| Hadeel Shehadeh  | Full Stack Developer: Student Management Module (UI + Firebase Integration)                                                                                          |
| Afnan Rabeih     | Full Stack Developer: Authentication (Login & Signup) (UI + Firebase Integration)                                                                                    |
| Mahmoud Masri    | Full Stack Developer: Forms Module (UI + Firebase Integration)                                                                                                       |
| George Abu Said  | Full Stack Developer: Dashboard (Admin & Singer), Notifications, Messages & Chat, Statistics, Leaderboard, Streaks, Achievements, Biometric Auth (UI + Firebase Integration) |

---

## About the App

A cross-platform mobile app (iOS / Android / Web) for managing the Jerusalem Youth Chorus — handling events, attendance, music library, student information, real-time messaging, gamification (leaderboard, streaks, achievements), and biometric login.

---

## Tech Stack

| Technology              | Purpose                        |
| ----------------------- | ------------------------------ |
| React Native + Expo     | Mobile framework               |
| Expo Router             | File-based navigation          |
| Firebase Auth           | Authentication                 |
| Cloud Firestore         | Real-time database             |
| Firebase Storage        | File & media storage           |
| expo-local-authentication | Biometric / Face ID login    |
| expo-secure-store       | Encrypted credential storage   |
| expo-av                 | Audio recording & playback     |
| TypeScript / JavaScript | Programming languages          |

---

## Roles

### Admin

- Manage events (create, edit, delete)
- Mark and save attendance
- Upload materials to Music Library
- View Calendar with event dots
- Manage singers (users with role "singer")
- Manage leaderboard challenges and manually adjust points
- Create and award custom achievement badges
- Send direct messages and manage group chats
- View real-time statistics and analytics

### Singer (Student)

- View upcoming events (by year group)
- View Calendar
- Access Music Library materials
- See personal streak, rank, and achievements on dashboard
- Send and receive direct messages and group chats
- Submit forms

---

## Project Structure

```
mobile-app/
│
├── app/                                # Expo Router — screens & navigation
│   ├── _layout.tsx                     # Root layout (AuthProvider, Stack)
│   ├── index.tsx                       # Entry point — redirect by role
│   ├── attendance.js                   # Attendance screen
│   ├── event-detail.tsx                # Event detail screen
│   ├── create-form.tsx                 # Create form screen
│   ├── profile.tsx                     # Profile screen (with biometric enrolment)
│   ├── statistics.tsx                  # Statistics & analytics screen
│   ├── leaderboard.tsx                 # Full leaderboard with podium
│   ├── manage-leaderboard.tsx          # Admin: challenges, adjust points, reset
│   ├── modal.tsx                       # Modal screen
│   │
│   ├── (auth)/                         # Authentication screens
│   │   ├── _layout.tsx                 # Auth stack layout
│   │   ├── login.tsx                   # Login (Admin: email, Singer: phone) + Face ID
│   │   └── signup.tsx                  # Singer registration
│   │
│   ├── (tabs)/                         # Main tab navigation
│   │   ├── _layout.tsx                 # Tab bar configuration
│   │   ├── index.tsx                   # Dashboard (admin + singer views)
│   │   ├── students.tsx                # Students management
│   │   ├── events.tsx                  # Events tab (Admin + Student)
│   │   ├── forms.tsx                   # Forms & surveys
│   │   ├── library.js                  # Music Library tab
│   │   ├── messages.tsx                # Full chat screen (DM + group)
│   │   ├── notifications.tsx           # Notifications (alerts + messages tab)
│   │   ├── calendar.js                 # Calendar (hidden — merged into Events)
│   │   ├── admin.tsx                   # Admin panel (hidden)
│   │   ├── explore.tsx                 # Explore (hidden)
│   │   ├── Join-requests.tsx           # Join requests (hidden)
│   │   ├── student-events.tsx          # Student events (hidden)
│   │   └── student-calender.tsx        # Student calendar (hidden)
│   │
│   ├── event/[id].tsx                  # Dynamic event detail
│   ├── form/[id].tsx                   # Dynamic form detail
│   └── student/[id].tsx                # Dynamic student detail
│
├── src/                                # Source files
│   │
│   ├── screens/                        # Legacy screen components (not active)
│   │   ├── EventsScreen.js
│   │   ├── EventStudentScreen.js
│   │   ├── CalendarScreen.js
│   │   ├── LibaryScreen.js
│   │   ├── AttendanceScreen.js
│   │   ├── EventDetailScreen.js
│   │   ├── Admineventscreen.js
│   │   └── Studentcalenderscreen.js
│   │
│   ├── context/                        # React Context providers
│   │   ├── AuthContext.tsx             # Auth state (user, role, login, logout)
│   │   └── EventsContext.js            # Events state (Firebase)
│   │
│   ├── components/                     # Reusable components
│   │   ├── NotificationBell.tsx        # Bell icon with unread badge (header)
│   │   └── ManageAchievementsModal.tsx # Admin: create/award/delete achievement badges
│   │
│   ├── firebase/                       # Firebase configuration
│   │   ├── firebase.ts                 # Firebase app init (db, auth)
│   │   ├── firestoreService.ts         # Firestore helpers
│   │   └── interfaces.ts              # TypeScript interfaces
│   │
│   ├── data/                           # Data services & mock data
│   │   ├── mockData.js                 # Brand colors & constants
│   │   ├── mockData.ts                 # TypeScript mock data
│   │   ├── studentService.ts           # Student CRUD service
│   │   ├── messageService.ts           # Real-time DM + group chat service
│   │   ├── notificationService.ts      # Real-time notifications service
│   │   ├── leaderboardService.ts       # Points, challenges, rankings service
│   │   ├── presenceService.ts          # Online status tracking service
│   │   └── statsData.ts               # Statistics mock data & types
│   │
│   └── utils/                          # Utility functions
│       ├── biometricAuth.ts            # Face ID / fingerprint auth + SecureStore
│       ├── eventUtils.js               # Event helper functions
│       ├── timeUtils.ts                # Relative timestamp formatting
│       └── notifMeta.ts               # Notification icon/color metadata
│
└── backend/                            # Firebase backend services
    ├── firebase.js                     # Firebase config (db, storage, auth)
    ├── eventsService.js                # Events CRUD + getStudents
    └── attendanceService.js            # Attendance save & load
```

---

## Firebase Collections

| Collection           | Description                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `events`             | Choir events — title, date, time, location, group                                             |
| `users`              | Unified user profiles — name, role, phone, group_id, is_online, last_seen, awarded_achievements |
| `attendance`         | Attendance records per event (present / absent / late / excused)                              |
| `library`            | Music library — files (Firebase Storage) + YouTube links                                      |
| `forms`              | Forms and surveys                                                                             |
| `form_submissions`   | Student form submission records                                                               |
| `voice-types`        | Available voice types — name                                                                  |
| `groups`             | Choir groups (years) — name, year_id, program_id                                             |
| `notifications`      | Notifications — title, body, type, is_read, target_uid, timestamp                            |
| `messages`           | DM and group chat messages — content, type, reactions, reply_to, is_read                     |
| `chat_groups`        | Chat group definitions — name, members (array of UIDs), created_by                           |
| `leaderboard`        | Singer rankings — uid, name, voice_type, points                                              |
| `leaderboard_config` | Active challenge config — id, label, points, active (boolean)                                |
| `achievements`       | Custom badge definitions — emoji, label, sublabel, color, createdBy                          |

---

## Design System

### Colors — 60/30/10 Rule

| Color          | HEX       | Usage                          |
| -------------- | --------- | ------------------------------ |
| Teal (Primary) | `#039899` | Headers, buttons, badges — 30% |
| White / Light  | `#f5fafe` | Background, cards — 60%        |
| Red (Accent)   | `#c56451` | Delete, Year 2 — 10%           |
| Yellow         | `#cfad5d` | Attendance, Year 1             |
| Purple         | `#6b5ce7` | Year 3                         |

### Spacing

All spacing uses multiples of 8px: `8, 16, 24, 32...`

### Typography

| Element    | Size | Weight |
| ---------- | ---- | ------ |
| Page Title | 32px | 900    |
| Card Title | 18px | 800    |
| Body       | 15px | 400    |
| Badge      | 11px | 700    |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- Expo Go app (for mobile testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/jce-kehila-2026/kehila2026-jerusalemyouthcenter-team7

# Navigate to project
cd mobile-app

# Install dependencies
npm install

# Start the development server
npx expo start
```

---

## Features

### Events Module

- Create, edit, delete events
- Filter by year group (Year 1, 2, 3, All Groups)
- Date format: DD/MM/YYYY
- Location validation (Israel only)
- List + Calendar toggle view

### Attendance Module

- Mark students: On Time, Late, Absent, School Trip, Sick
- Save attendance to Firestore
- Load previously saved attendance
- Statistics counter per status

### Calendar Module

- Integrated inside Events screen (no separate tab)
- Color-coded dots per group
- Click on date to filter events

### Music Library

- Upload files to Firebase Storage (PDF, MP3, ZIP, images, etc.)
- Add YouTube links with group assignment
- Filter by year group (Admin only)
- Students see only their group's materials + All Groups

### Student Management

- Display all registered choir students
- Search students by name
- Filter students by Year Group
- Filter students by Voice Type
- Display student rankings (Leaderboard)
- Navigate to individual student profiles
- Role-based student visibility (Admin / Singer)

### Student Details

- View complete student profile
- Display personal, contact, and parent information
- Display attendance history
- Edit student information (Admin only)
- Change student's assigned group
- Save profile updates to Firestore
- Automatic loading state and error handling

### Group & Voice Management

- Add new choir year groups
- Delete custom year groups
- Add custom voice types
- Delete custom voice types
- Prevent duplicate years and voice types
- Prevent deletion of default year groups (Year 1–3)
- Prevent deletion of default voice types (Soprano, Alto, Tenor, Bass)

### Student Service Layer

- Retrieve all singers from Firestore
- Retrieve a single student by ID
- Retrieve choir groups from Firestore
- Update student's assigned group
- Automatically synchronize student's year with selected group
- Create, update, and delete groups
- Centralized Firestore database operations

### Firestore Integration

- Real-time updates using onSnapshot
- Query students by role
- Sort groups using year_id
- Retrieve documents using getDoc and getDocs
- Create documents using addDoc
- Update documents using updateDoc
- Delete documents using deleteDoc

### Navigation

- Navigate between Students List and Student Details
- Navigate to Student Details using route parameters
- Return to previous screens using router navigation

### Forms Management

- Create, edit, and delete dynamic forms (Admin)
- Real-time database integration for form generation
- Manage, view, and track user form submissions
- Dedicated "Pending Forms" view to notify students of incomplete surveys

### Profile & Authentication

- Interactive user profile with personalized avatar rendering
- Manage personal information display
- Implement robust Sign-Out functionality
- Secure Password Change capabilities from within the profile screen

### User Permissions

- Admins can edit student information
- Admins can manage groups and voice types
- Admins can approve or reject join requests
- Singers can only access information permitted by their role
- Role-based UI rendering throughout the application

---

## Dashboard Module

The dashboard (`app/(tabs)/index.tsx`) is fully role-aware and renders a different layout for Admins vs Singers.

### Admin Dashboard

- **Hero card:** Personalized greeting, total singer count, how many singers are currently online (real-time), next scheduled event, top-ranked singer, and top-streak singer
- **Needs Attention panel:** Pending join requests count + this week's events count — quick links to take action
- **6-card KPI grid:** Singers total, Leaderboard rank summary, Forms pending, Join Requests, Admins count, Achievements count
- **Quick action buttons:** New Event, Upload Files, Full Stats — deep-link shortcuts
- **Weekly attendance bar chart:** Visual overview of attendance rates for the current week
- **Upcoming events list:** Next rehearsals with date, time, group, and location

### Singer Dashboard

- **Hero welcome card:** First-name greeting, current streak count, voice type badge, next upcoming event
- **Weekly leaderboard podium:** Top 3 singers displayed on a 3-position podium with medal emojis (🥇🥈🥉), avatar circles, names, and points; "YOU ⭐" tag highlights the logged-in singer
- **Achievements / Badges row:** Horizontal scroll of earned achievement badges (emoji + label + sublabel + color), including both system and admin-awarded custom badges
- **6 Quick Access cards:** Color-coded shortcut tiles to the main app sections (Events, Library, Forms, Messages, Notifications, Statistics)
- **My upcoming events:** Filtered to the singer's own year/group

**Firestore collections used:** `users`, `events`, `event_students`, `attendance`, `library`, `leaderboard`, `achievements`, `chat_groups`, `form_submissions`

---

## Notifications Module

`app/(tabs)/notifications.tsx` — real-time notification center.

- **Dual-tab layout:** Alerts tab (event/form/general notifications) and Messages tab (message-type notifications), each with its own unread count badge
- **Notification cards:** Icon color-coded by type (teal for events, yellow for forms, red for alerts), title, body preview, relative timestamp (e.g., "2 min ago")
- **Swipe to delete:** Swipe a notification right to remove it permanently
- **Mark all read:** Button appears when unread items exist; batch-updates all to is_read=true
- **Empty state:** Contextual icon and message when a tab has no notifications
- **Header bell:** `NotificationBell` component shows a red badge with unread count (capped at "9+") in the navigation header

**Firestore collections used:** `notifications`

**Real-time logic:** `notificationService.subscribe()` runs an `onSnapshot` listener filtered by `target_uid` (global notifications when absent, user-scoped when set). Notifications are ordered by timestamp descending.

---

## Messages & Chat Module

`app/(tabs)/messages.tsx` — full-featured real-time chat system with direct messages and group chats.

### Inbox & Thread Features

- **Conversation list:** All DMs grouped by contact, sorted by most recent message, with unread badge per conversation
- **Tab toggle:** Switch between Direct Messages and Group Chats
- **Contact search:** Search field to find users and start new DMs
- **Thread view:** Chat bubbles with sender name, timestamp, read receipts (✓ sent / ✓✓ read), own messages on right / others on left

### Rich Message Types

- **Text:** Standard chat messages
- **Images:** Thumbnail preview inline in the chat bubble; tap to view full size
- **Files:** File icon with filename and size display; tap to open
- **Voice notes:** Recorded with a long-press on the mic button; playback with play/pause button and duration progress slider
- **Audio upload:** Files stored to Firebase Storage under the `audio/` path

### Interaction Features

- **Reactions:** Long-press any message to open an emoji picker (❤️ 😂 👍 😮 😢 🔥); reactions display as small badges showing emoji + count below the message
- **Replies:** Tap reply on a message to quote it in the compose bar; the sent message shows the original message content as a quote above the reply text
- **Forward:** Select a message and forward it to one or multiple contacts
- **Selection mode:** Tap the checkbox icon to enter multi-select; bulk delete selected messages

### Voice Recording

- Long-press the microphone button to begin recording (expo-av Audio API)
- Timer displays elapsed recording time
- Release to stop recording; audio is uploaded to Firebase Storage and sent as a voice note
- Single active player per thread — playing a new note auto-stops the previous one

### Group Chat Management (Admin)

- Create new group chats with a name and selected member list
- Edit group name and members
- Delete group chats
- Members field stored as an array of UIDs; singers see only groups they belong to

**Firestore collections used:** `messages`, `chat_groups`, `users`

**Real-time logic:** `messageService.subscribe()` keeps an `onSnapshot` on all messages ordered by timestamp; DMs are grouped client-side by the other party's UID. `subscribeUnreadCount()` provides a live count of unread messages for the header badge.

---

## Statistics Module

`app/statistics.tsx` — interactive analytics dashboard with custom SVG charts.

### Filters

- **Year chips:** Defaults to 2026, 2025, 2024 (current year − cohort offset); any new year groups added in Firestore auto-appear as additional chips without code changes
- **Group chips:** All Groups, Year 1, Year 2, Year 3, Alumni

### Charts & KPIs

| Section | Type | Description |
|---------|------|-------------|
| Total Students | KPI card | Filtered student count + total mentoring hours |
| Avg Attendance | KPI card | Average attendance % across selected filters |
| Female / Male | KPI cards | Count + percentage of group |
| Yearly Avg Attendance | Area chart | Line + gradient fill; grid lines at 0/25/50/75/100% |
| Gender Split | Donut chart | Pink (female) / Blue (male) with legend |
| By Group | Stacked bar rows | Per-group F/M breakdown as horizontal bars |
| YoY Growth | Bar chart | Student count per calendar year (2023–2026) |
| Sessions / Month | Bar chart | Rehearsals per month with peak month highlighted |

All charts are built with custom SVG components (no third-party chart library): `AreaTrendChart`, `BarChart`, `DonutChart`. The layout is responsive — single-column for full-width charts, two-column for side-by-side cards.

**Firestore collections used:** `groups` (live, for dynamic year filter chips); statistics data is currently mock-based (statsData.ts).

---

## Leaderboard Module

### Singer View — `app/leaderboard.tsx`

- **Podium:** Visual 3-position podium with 2nd | 1st | 3rd placement; each position shows avatar circle, name, voice type, points, and medal emoji; heights differ to show ranking visually
- **"YOU ⭐" tag:** Highlights the logged-in singer's position on the podium or in the table
- **Full rankings table:** All singers sorted by points descending with rank number and points badge
- **My rank strip:** Sticky strip at the bottom showing the logged-in singer's current rank and total points

### Admin View — `app/manage-leaderboard.tsx` (3 tabs)

**Rankings tab**
- View all singers sorted by points with live updates

**Challenges tab**
- 13 predefined challenge catalogue items across 5 categories:
  - Music & Practice: Open Sheet Music, Listen Track, Visit Library
  - Attendance & Events: Attend Rehearsal, Register Event, On Time
  - Forms & Admin: Submit Form, Complete Profile, Update Contact
  - Behaviour & Participation: Help Member, Active Rehearsal, Bring Friend
  - Achievements: Perfect Attendance, All Forms, First Register
- Toggle each challenge active/inactive
- Set custom point values per challenge
- Add entirely custom challenges (label → auto-generates a slug ID)

**Adjust tab**
- Manually award or deduct points for any singer
- Reset entire leaderboard (records reset date)
- View date of last reset

**Firestore collections used:** `leaderboard`, `leaderboard_config`, `users`

**Real-time logic:** `leaderboardService.subscribe()` runs an `onSnapshot` ordered by points descending; singer's personal rank is derived from their index position in the live array.

---

## Streaks System

Streaks are computed in real-time on the dashboard from Firestore attendance records — no separate collection needed.

- **Calculation:** Past events are fetched and sorted descending by date; the system iterates from the most recent event backward, checking whether the singer's attendance status is `present`. The streak counter increments until it hits the first non-attended event.
- **Dashboard display:** Current streak count is shown in the Singer dashboard hero card
- **Admin visibility:** Top streak holder is shown in the Admin dashboard hero card
- **Leaderboard integration:** Streak data feeds into leaderboard points for the "Attend Rehearsal" and "Perfect Attendance" challenges

---

## Achievements Module

### Admin: `src/components/ManageAchievementsModal.tsx`

A modal with two tabs for full achievement lifecycle management:

**Definitions tab**
- Create new achievement badges with: emoji, label, sublabel, accent color (Teal / Amber / Red / Purple presets)
- Edit existing achievement definitions
- Delete achievements (with confirmation dialog)
- Real-time list via `onSnapshot` on the `achievements` collection

**Award tab**
- Select any singer from the user list
- View badges already awarded to that singer
- Award a badge → `arrayUnion(achievementId)` added to `users/{uid}.awarded_achievements`
- Remove a badge → `arrayRemove(achievementId)` from `awarded_achievements`

### Singer View

- Earned badges appear in the horizontal Achievements scroll on the Singer dashboard
- Each badge shows the emoji, label, sublabel, and accent color as defined by the admin

**Firestore collections used:** `achievements`, `users`

---

## Biometric Authentication (Face ID / Fingerprint)

`src/utils/biometricAuth.ts` — secure biometric login with encrypted credential storage.

### How It Works

1. **Enrolment (Profile screen):** After logging in with email/password or phone, a singer or admin can enable biometric login from their profile. Credentials are saved to `expo-secure-store` (AES-encrypted, device-only storage).
2. **Login (Login screen):** On next app open, if biometric enrolment was recorded, a Face ID / fingerprint prompt appears. On success, stored credentials are loaded from SecureStore and used to log in automatically without re-entering a password.
3. **Fallback:** The OS "Use Password" fallback is available if biometric fails.
4. **Disable:** Clearing the enrolment flag and stored credentials from the profile screen disables biometric login.

### API Surface (`src/utils/biometricAuth.ts`)

| Function | Description |
|----------|-------------|
| `isBiometricAvailable()` | Checks hardware support and OS enrolment status |
| `getBiometricType()` | Returns `"face"`, `"fingerprint"`, or `"none"` |
| `authenticateWithBiometrics(prompt)` | Shows the OS prompt; returns true on success |
| `saveCredentials(identifier, password, role)` | Encrypts and stores credentials in SecureStore |
| `loadCredentials()` | Returns stored credentials or null |
| `clearCredentials()` | Removes credentials from SecureStore |

**Dependencies:** `expo-local-authentication`, `expo-secure-store`

---

## Presence Tracking

`src/data/presenceService.ts` — real-time online status for all singers.

- When a singer opens the app, `startTracking(uid)` sets `is_online = true` and `last_seen` (ISO timestamp) on their `users` document
- An `AppState` listener updates `is_online` to false whenever the app goes to the background or is closed
- `subscribeOnlineCount(callback)` provides admins with a live count of singers currently online (shown in the Admin dashboard hero card)
- `subscribePresence(callback)` maps all singers' `is_online` and `last_seen` values for real-time presence indicators

**Firestore fields updated:** `users/{uid}.is_online`, `users/{uid}.last_seen`

---

## Security

- Firebase Auth required for all operations
- Firestore rules enforce role-based access
- Storage rules require authentication
- Protected routes per user role (Admin / Singer)
- Biometric credentials stored in OS-level encrypted SecureStore (never sent to server)

---

## Test Plan

| TC    | Module                  | Description                                        | Status |
| ----- | ----------------------- | -------------------------------------------------- | ------ |
| TC-01 | Events                  | Add new event with valid data                      | Pass   |
| TC-02 | Attendance              | Mark and save attendance                           | Pass   |
| TC-03 | Calendar                | Event dots appear on correct dates                 | Pass   |
| TC-04 | Library                 | Admin uploads file to Music Library                | Pass   |
| TC-05 | Students List           | Display all singers from Firestore                 | Pass   |
| TC-06 | Students List           | Search students by full name                       | Pass   |
| TC-07 | Students List           | Filter students by year group                      | Pass   |
| TC-08 | Students List           | Filter students by voice type                      | Pass   |
| TC-09 | Student Details         | Display selected student's profile                 | Pass   |
| TC-10 | Student Details         | Edit and save student information                  | Pass   |
| TC-11 | Student Details         | Change student's assigned group                    | Pass   |
| TC-12 | Group Management        | Add new year group                                 | Pass   |
| TC-13 | Group Management        | Prevent duplicate year groups                      | Pass   |
| TC-14 | Group Management        | Delete custom year groups                          | Pass   |
| TC-15 | Voice Management        | Add custom voice type                              | Pass   |
| TC-16 | Voice Management        | Prevent duplicate voice types                      | Pass   |
| TC-17 | Voice Management        | Delete custom voice types                          | Pass   |
| TC-18 | Student Service         | Retrieve all students                              | Pass   |
| TC-19 | Student Service         | Retrieve student by ID                             | Pass   |
| TC-20 | Student Service         | Update student's group assignment                  | Pass   |
| TC-21 | Firestore               | Real-time updates using onSnapshot                 | Pass   |
| TC-22 | Navigation              | Open Student Details from Students List            | Pass   |
| TC-23 | Permissions             | Admin-only editing and management actions          | Pass   |
| TC-24 | Error Handling          | Display loading and handle Firestore errors        | Pass   |
| TC-25 | Admin Dashboard         | KPI cards display correct live data                | Pass   |
| TC-26 | Admin Dashboard         | Online singer count updates in real-time           | Pass   |
| TC-27 | Admin Dashboard         | Needs Attention panel shows pending requests       | Pass   |
| TC-28 | Singer Dashboard        | Hero card shows correct streak count               | Pass   |
| TC-29 | Singer Dashboard        | Leaderboard podium shows top 3 with correct ranks  | Pass   |
| TC-30 | Singer Dashboard        | Achievements row shows earned badges               | Pass   |
| TC-31 | Notifications           | Alerts and Messages tabs display correct items     | Pass   |
| TC-32 | Notifications           | Swipe to delete removes notification               | Pass   |
| TC-33 | Notifications           | Mark all read updates all unread to read           | Pass   |
| TC-34 | Notifications           | Bell badge shows correct unread count              | Pass   |
| TC-35 | Messages                | Send and receive direct messages in real-time      | Pass   |
| TC-36 | Messages                | Send and receive group chat messages               | Pass   |
| TC-37 | Messages                | Add emoji reaction to a message                    | Pass   |
| TC-38 | Messages                | Reply with quoted message                          | Pass   |
| TC-39 | Messages                | Record and play back voice note                    | Pass   |
| TC-40 | Messages                | Forward message to another contact                 | Pass   |
| TC-41 | Messages                | Admin creates and edits a group chat               | Pass   |
| TC-42 | Statistics              | Year filter chips show correct calendar years      | Pass   |
| TC-43 | Statistics              | Filtering by group updates all charts and KPIs     | Pass   |
| TC-44 | Statistics              | Dynamic year chips appear for new Firestore groups | Pass   |
| TC-45 | Leaderboard             | Podium displays top 3 singers with correct points  | Pass   |
| TC-46 | Leaderboard             | "YOU" tag highlights the logged-in singer          | Pass   |
| TC-47 | Leaderboard             | Admin can activate/deactivate challenges           | Pass   |
| TC-48 | Leaderboard             | Admin can manually adjust singer points            | Pass   |
| TC-49 | Leaderboard             | Reset leaderboard clears all points                | Pass   |
| TC-50 | Streaks                 | Streak count increments on consecutive attendance  | Pass   |
| TC-51 | Streaks                 | Streak resets after a missed rehearsal             | Pass   |
| TC-52 | Achievements            | Admin creates a new badge definition               | Pass   |
| TC-53 | Achievements            | Admin awards badge to a singer                     | Pass   |
| TC-54 | Achievements            | Singer sees awarded badge on dashboard             | Pass   |
| TC-55 | Achievements            | Admin removes badge from singer                    | Pass   |
| TC-56 | Biometric Auth          | Face ID prompt appears if enrolled                 | Pass   |
| TC-57 | Biometric Auth          | Successful biometric scan logs user in             | Pass   |
| TC-58 | Biometric Auth          | Credentials saved securely in SecureStore          | Pass   |
| TC-59 | Biometric Auth          | Disabling biometric clears stored credentials      | Pass   |
| TC-60 | Presence Tracking       | Singer shows as online when app is active          | Pass   |
| TC-61 | Presence Tracking       | Singer shows as offline when app is backgrounded   | Pass   |

---
