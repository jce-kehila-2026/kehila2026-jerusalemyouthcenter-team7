# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx expo start          # Start the dev server (opens QR for Expo Go / simulators)
npx expo start --android
npx expo start --ios
npx expo start --web
npm run lint            # ESLint via expo lint
```

There is no test runner configured. `npm run reset-project` wipes `app/` to a blank scaffold — do not run it.

## Architecture Overview

**Expo Router (file-based routing)** drives all navigation. The entry point is `app/index.tsx`, which redirects to `/(auth)/login` or `/(tabs)` based on auth state.

### Route tree

```
app/
  index.tsx               → auth gate redirect
  _layout.tsx             → root Stack; wraps everything in <AuthProvider>
  (auth)/                 → login + signup screens (Stack group, no tabs)
  (tabs)/                 → main app (Tab group)
    _layout.tsx           → defines bottom tab bar; tabs hidden with href:null still exist as routes
    index.tsx             → Dashboard (admin and student views branch on user.role)
    students.tsx          → student list (admin only)
    events.tsx            → events list
    forms.tsx             → forms
    library.js            → library
    calendar.js           → calendar
    messages.tsx          → messaging (hidden from tab bar; reached via header icon)
    notifications.tsx     → notifications (hidden from tab bar; reached via header icon)
  profile.tsx             → profile screen (Stack screen, not a tab)
  student/[id].tsx        → student detail
  event/[id].tsx          → event detail
  form/[id].tsx           → form detail / submission
```

### Auth & roles

`src/context/AuthContext.tsx` is the single source of truth for the session.

- Two main roles: `"singer"` and `"admin"`. Singers log in with phone number (mapped to `<digits>@kehila.app`); admins use email directly.
- `useAuth()` exposes `{ user, isAuthenticated, isLoading, login, signupStudent, logout }`.
- `user.role` drives every conditional branch in the UI (admin sees full CRUD; students see their own data).
- Firebase Auth UID is the document ID in the `users` Firestore collection.

### Firebase

`src/firebase/firebase.ts` initialises the app and exports `db` (Firestore) and `auth` (Firebase Auth). Always import from there, never re-initialise.

Firestore collections in use: `users`, `events`, `event_students`, `forms`, `attendance`, `notifications`, `messages`, `groups`.

### Data layer

Services in `src/data/` wrap Firestore operations:

- `studentService.ts` — CRUD for students and groups
- `notificationService.ts` — real-time `onSnapshot` subscription + `markRead`
- `messageService.ts` — real-time messaging subscription

For screens that still use mock data fallbacks, mock data lives in `src/data/mockData.js` and `src/data/mockData.ts` (the `.ts` file contains the shared TypeScript types).

`src/context/EventsContext.js` provides `useEvents()` with `events`, `addEvent`, `updateEvent`, `deleteEvent`. It is mounted inside the tabs group only (`app/(tabs)/_layout.tsx`).

### Theme & styling

All screens use `StyleSheet.create()` — no Tailwind or CSS modules.

`constants/theme.ts` exports:

- `AppColors` — brand palette (`primary`, `secondary`, `success`, `danger`, `warning`, `purple` + light variants)
- `Colors` — light/dark token maps (`text`, `subtext`, `background`, `card`, `border`, `icon`, `tint`, `tabIcon*`)
- `Fonts` — platform-specific font stacks

Use `useColorScheme()` from `hooks/use-color-scheme.ts` then `Colors[colorScheme ?? 'light']` to resolve the active theme tokens. `AppColors` values are fixed (not theme-aware).

The `profile.tsx` screen uses a local `themeColors` object instead — this is legacy; prefer `AppColors`/`Colors` in new code.

### Path aliases

`@/` maps to the repo root (configured in `tsconfig.json`). Use it for all non-relative imports.

### Mixed JS/TS

Several screens in `app/(tabs)/` and `src/screens/` are plain `.js`. New files should be `.tsx`/`.ts`. The `src/screens/` directory contains legacy screen components that are no longer wired into the router — prefer `app/(tabs)/` for active screens.

### Expo config

`app.json` enables `typedRoutes` and `reactCompiler` experiments, and `newArchEnabled: true`. The `scheme` is `mobileapp`.
