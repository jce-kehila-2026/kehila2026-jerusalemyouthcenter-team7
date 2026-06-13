# 🎵 Jerusalem Youth Chorus — Management System

A mobile management application for the Jerusalem Youth Chorus, built with React Native and Expo Router.

---

##  Team Members

| Name | Role |
|------|------|
|   Rania Shqerat   |  Full Stack Developer : Events, Attendance, Calendar & Music Library (UI + Firebase Integration)    |
|  Hadeel Shehadeh    |   Full Stack Developer : Student Management Module (UI + Firebase Integration)   |
|   Afnan Rabeih   | Full Stack Developer : Authentication (Login & Signup) (UI + Firebase Integration)    |
|   Mahmoud Masri   |Full Stack Developer : Forms Module  (UI + Firebase Integration)    |
| George Abo Saeed     |Full Stack Developer :Dashboard, Notifications & Statistics (UI + Firebase Integration)     |

---

## About the App

A cross-platform mobile app (iOS / Android / Web) for managing the Jerusalem Youth Chorus — handling events, attendance, music library, and student information.

---

##  Tech Stack

| Technology | Purpose |
|------------|---------|
| React Native + Expo | Mobile framework |
| Expo Router | File-based navigation |
| Firebase Auth | Authentication |
| Cloud Firestore | Database |
| Firebase Storage | File storage |
| TypeScript / JavaScript | Programming languages |

---

## Roles

### Admin
- Manage events (create, edit, delete)
- Mark and save attendance
- Upload materials to Music Library
- View Calendar with event dots
- Manage students

### Student
- View upcoming events (by year group)
- View Calendar
- Access Music Library materials

---

mobile-app/
│
├── app/                              # Expo Router — all screens & navigation
│   ├── _layout.tsx                   # Root layout (AuthProvider, Stack)
│   ├── index.tsx                     # Entry point — redirect by role
│   ├── attendance.js                 # Attendance screen
│   ├── event-detail.tsx              # Event detail screen
│   ├── add-student.tsx               # Add student screen
│   ├── create-form.tsx               # Create form screen
│   ├── profile.tsx                   # Profile screen
│   ├── statistics.tsx                # Statistics screen
│   ├── modal.tsx                     # Modal screen
│   │
│   ├── (auth)/                       # Authentication screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx                 # Login (Admin: email, Student: phone)
│   │   └── signup.tsx                # Student registration
│   │
│   ├── (tabs)/                       # Main tab navigation
│   │   ├── _layout.tsx               # Tab bar configuration (5 tabs)
│   │   ├── index.tsx                 # Dashboard
│   │   ├── students.tsx              # Students management
│   │   ├── events.tsx                # Events tab (Admin/Student)
│   │   ├── forms.tsx                 # Forms & surveys
│   │   ├── library.js                # Music Library tab
│   │   ├── messages.tsx              # Messages (hidden)
│   │   ├── notifications.tsx         # Notifications (hidden)
│   │   ├── calendar.js               # Calendar (hidden — merged into Events)
│   │   ├── admin.tsx                 # Admin panel (hidden)
│   │   ├── explore.tsx               # Explore (hidden)
│   │   ├── Join-requests.tsx         # Join requests (hidden)
│   │   ├── student-events.tsx        # Student events (hidden)
│   │   └── student-calender.tsx      # Student calendar (hidden)
│   │
│   ├── event/[id].tsx                # Dynamic event detail
│   ├── form/[id].tsx                 # Dynamic form detail
│   └── student/[id].tsx              # Dynamic student detail
│
├── src/                              # Source files
│   ├── screens/                      # Screen components
│   │   ├── EventsScreen.js           # Admin events (List + Calendar)
│   │   ├── EventStudentScreen.js     # Student events (List + Calendar)
│   │   ├── CalendarScreen.js         # Calendar screen
│   │   ├── LibaryScreen.js           # Music Library screen
│   │   ├── AttendanceScreen.js       # Attendance screen
│   │   ├── EventDetailScreen.js      # Event detail
│   │   ├── Admineventscreen.js       # Admin event management
│   │   └── Studentcalenderscreen.js  # Student calendar
│   │
│   ├── context/                      # React Context providers
│   │   ├── AuthContext.tsx           # Auth state (user, role, login, logout)
│   │   └── EventsContext.js          # Events state (Firebase)
│   │
│   ├── components/                   # Reusable components
│   │   └── NotificationBell.tsx      # Notification bell component
│   │
│   ├── firebase/                     # Firebase configuration
│   │   ├── firebase.ts               # Firebase app init
│   │   ├── firestoreService.ts       # Firestore helpers
│   │   └── interfaces.ts             # TypeScript interfaces
│   │
│   ├── data/                         # Data & services
│   │   ├── mockData.js               # Brand colors & constants
│   │   ├── mockData.ts               # TypeScript mock data
│   │   ├── studentService.ts         # Student data service
│   │   ├── messageService.ts         # Message service
│   │   ├── notificationService.ts    # Notification service
│   │   └── statsData.ts              # Statistics data
│   │
│   └── utils/                        # Utility functions
│       ├── eventUtils.js             # Event helper functions
│       ├── timeUtils.ts              # Time formatting
│       └── notifMeta.ts              # Notification metadata
│
└── backend/                          # Firebase backend services
    ├── firebase.js                   # Firebase config (db, storage, auth)
    ├── eventsService.js              # Events CRUD + getStudents
    └── attendanceService.js          # Attendance save & load

##  Firebase Collections

| Collection | Description |
|-----------|-------------|
| `events` | Choir events with date, time, location, group |
| `students` | Student profiles and information |
| `admins` | Admin profiles |
| `attendance` | Attendance records per event |
| `library` | Music library files and YouTube links |
| `forms` | Forms and surveys |

---

##  Design System

### Colors — 60/30/10 Rule
| Color | HEX | Usage |
|-------|-----|-------|
| Teal (Primary) | `#039899` | Headers, buttons, badges — 30% |
| White/Light | `#f5fafe` | Background, cards — 60% |
| Red (Accent) | `#c56451` | Delete, Year 2 — 10% |
| Yellow | `#cfad5d` | Attendance, Year 1 |

### Spacing
All spacing uses multiples of 8px: `8, 16, 24, 32...`

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

### Environment
Firebase config is located in `backend/firebase.js`.

---

## 📋 Features

### ✅ Events Module
- Create, edit, delete events
- Filter by year group (Year 1, 2, 3, All Groups)
- Date format: DD/MM/YYYY
- Location validation (Israel only)

### ✅ Attendance Module
- Mark students: On Time, Late, Absent, School Trip, Sick
- Save attendance to Firestore
- Load previously saved attendance

### ✅ Calendar Module
- Integrated inside Events screen
- Color-coded dots per group
- Click on date to see events

### ✅ Music Library
- Upload files to Firebase Storage
- Add YouTube links
- Filter by year group
- Students see only their group's materials

---

## 🔐 Security

- Firebase Auth required for all operations
- Firestore rules enforce role-based access
- Storage rules require authentication
- Protected routes per user role

---

## Test Plan

| TC | Module | Description | Status |
|----|--------|-------------|--------|
| TC-01 | Events | Add new event with valid data | Pass |
| TC-02 | Attendance | Mark and save attendance | Pass |
| TC-03 | Calendar | Event dots appear on correct dates | Pass |
| TC-04 | Library | Admin uploads file | Pass |

---

##  Course
**JCE — Jerusalem College of Engineering**
Full Stack Development Course — 2026
