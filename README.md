# 🎵 Jerusalem Youth Chorus — Management System

This project is developed for the Jerusalem Youth Center, an organization that works with youth through music. The system is intended to support student management, communication, attendance tracking, and activity monitoring. Built with React Native and Expo Router.

---

## Team Members

| Name             | Role                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Rania Shqerat    | Full Stack Developer :Events, Attendance, Calendar & Music Library (UI + Firebase Integration) |
| Hadeel Shehadeh  | Full Stack Developer :Student Management Module (UI + Firebase Integration)                    |
| Afnan Rabeih     | Full Stack Developer : Authentication (Login & Signup) (UI + Firebase Integration)             |
| Mahmoud Masri    | Full Stack Developer :Forms Module (UI + Firebase Integration)                                 |
| George Abo Saeed | Full Stack Developer : Dashboard, Notifications & Statistics (UI + Firebase Integration)       |

---

## About the App

A cross-platform mobile app (iOS / Android / Web) for managing the Jerusalem Youth Chorus — handling events, attendance, music library, and student information.

---

## Tech Stack

| Technology              | Purpose               |
| ----------------------- | --------------------- |
| React Native + Expo     | Mobile framework      |
| Expo Router             | File-based navigation |
| Firebase Auth           | Authentication        |
| Cloud Firestore         | Database              |
| Firebase Storage        | File storage          |
| TypeScript / JavaScript | Programming languages |

---

## Roles

### Admin

- Manage events (create, edit, delete)
- Mark and save attendance
- Upload materials to Music Library
- View Calendar with event dots
- Manage singers (users with role "singer")

### Singer (Student)

- View upcoming events (by year group)
- View Calendar
- Access Music Library materials

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
│   ├── add-student.tsx                 # Add student screen
│   ├── create-form.tsx                 # Create form screen
│   ├── profile.tsx                     # Profile screen
│   ├── statistics.tsx                  # Statistics screen
│   ├── modal.tsx                       # Modal screen
│   │
│   ├── (auth)/                         # Authentication screens
│   │   ├── _layout.tsx                 # Auth stack layout
│   │   ├── login.tsx                   # Login (Admin: email, Student: phone)
│   │   └── signup.tsx                  # Student registration
│   │
│   ├── (tabs)/                         # Main tab navigation (5 tabs)
│   │   ├── _layout.tsx                 # Tab bar configuration
│   │   ├── index.tsx                   # Dashboard
│   │   ├── students.tsx                # Students management
│   │   ├── events.tsx                  # Events tab (Admin + Student)
│   │   ├── forms.tsx                   # Forms & surveys
│   │   ├── library.js                  # Music Library tab
│   │   ├── messages.tsx                # Messages (hidden)
│   │   ├── notifications.tsx           # Notifications (hidden)
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
│   ├── screens/                        # Screen components
│   │   ├── EventsScreen.js             # Admin events (List + Calendar)
│   │   ├── EventStudentScreen.js       # Student events (List + Calendar)
│   │   ├── CalendarScreen.js           # Calendar screen
│   │   ├── LibaryScreen.js             # Music Library screen
│   │   ├── AttendanceScreen.js         # Attendance screen
│   │   ├── EventDetailScreen.js        # Event detail
│   │   ├── Admineventscreen.js         # Admin event management
│   │   └── Studentcalenderscreen.js    # Student calendar
│   │
│   ├── context/                        # React Context providers
│   │   ├── AuthContext.tsx             # Auth state (user, role, login, logout)
│   │   └── EventsContext.js            # Events state (Firebase)
│   │
│   ├── components/                     # Reusable components
│   │   └── NotificationBell.tsx        # Notification bell component
│   │
│   ├── firebase/                       # Firebase configuration
│   │   ├── firebase.ts                 # Firebase app init
│   │   ├── firestoreService.ts         # Firestore helpers
│   │   └── interfaces.ts              # TypeScript interfaces
│   │
│   ├── data/                           # Data & services
│   │   ├── mockData.js                 # Brand colors & constants
│   │   ├── mockData.ts                 # TypeScript mock data
│   │   ├── studentService.ts           # Student data service
│   │   ├── messageService.ts           # Message service
│   │   ├── notificationService.ts      # Notification service
│   │   └── statsData.ts               # Statistics data
│   │
│   └── utils/                          # Utility functions
│       ├── eventUtils.js               # Event helper functions
│       ├── timeUtils.ts                # Time formatting
│       └── notifMeta.ts               # Notification metadata
│
└── backend/                            # Firebase backend services
    ├── firebase.js                     # Firebase config (db, storage, auth)
    ├── eventsService.js                # Events CRUD + getStudents
    └── attendanceService.js            # Attendance save & load
```

---

## Firebase Collections

| Collection   | Description                                                                          |
| ------------ | ------------------------------------------------------------------------------------ |
| `events`     | Choir events — title, date, time, location, group                                    |
| `users`      | Unified user profiles (Singers, Admins, Join Requests) — name, role, phone, group_id |
| `attendance` | Attendance records per event                                                         |
| `library`    | Music library — files (Firebase Storage) + YouTube links                             |
| `forms`      | Forms and surveys                                                                    |

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

---

## Security

- Firebase Auth required for all operations
- Firestore rules enforce role-based access
- Storage rules require authentication
- Protected routes per user role (Admin / Student)

---

## Test Plan

| TC    | Module     | Description                         | Status |
| ----- | ---------- | ----------------------------------- | ------ |
| TC-01 | Events     | Add new event with valid data       | Pass   |
| TC-02 | Attendance | Mark and save attendance            | Pass   |
| TC-03 | Calendar   | Event dots appear on correct dates  | Pass   |
| TC-04 | Library    | Admin uploads file to Music Library | Pass   |

---
