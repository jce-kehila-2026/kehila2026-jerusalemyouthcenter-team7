const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { google } = require("googleapis");
const path = require("path");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// The calendar we created and shared with the service account.
const CALENDAR_ID =
  "6ee65334f0a4c98b5d09abd1f1f2e38c42a93f8ce246d56fb0e9041f0ed7fa4d@group.calendar.google.com";

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "service-account-key.json"),
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

const calendar = google.calendar({ version: "v3", auth });

// Converts our app's date ("YYYY-MM-DD") + time ("HH:MM") into a Google
// Calendar start/end time. Defaults to a 1-hour duration.
function buildEventTimes(date, time) {
  const safeTime = time || "00:00";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(safeTime)) {
    return null;
  }
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = safeTime.split(":").map(Number);

  // Date.UTC is used here purely as a neutral calculator for wall-clock
  // arithmetic (adding 1 hour) — it carries no real timezone meaning.
  // We send the result WITHOUT a "Z"/offset, paired with timeZone below,
  // so Google Calendar reads it as plain Israel local time (17:30 stays
  // 17:30) instead of double-converting it.
  const startMs = Date.UTC(year, month - 1, day, hour, minute);
  const endMs = startMs + 60 * 60 * 1000;

  const format = (ms) => {
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
  };

  return {
    start: { dateTime: format(startMs), timeZone: "Asia/Jerusalem" },
    end: { dateTime: format(endMs), timeZone: "Asia/Jerusalem" },
  };
}

// Runs every time a document in the "events" collection is created or
// updated. Creates a matching Google Calendar event, or updates the
// existing one if this event was already synced before.
//
// Events that were themselves imported FROM Google Calendar (source ===
// "google", written by getGoogleCalendarEvents below) are skipped here —
// otherwise we'd push them straight back to Google as "new" events,
// creating a duplicate / infinite back-and-forth loop.
exports.syncEventToGoogleCalendar = onDocumentWritten(
  "events/{eventId}",
  async (event) => {
    const afterData = event.data.after?.data();

    // Document was deleted — nothing to sync.
    if (!afterData) return;

    // Avoid re-pushing events that originated in Google Calendar.
    if (afterData.source === "google") return;

    const { title, description, date, time, location } = afterData;
    if (!date) return;

    const eventTimes = buildEventTimes(date, time);
    if (!eventTimes) {
      console.error("Skipping calendar sync — invalid date/time:", date, time);
      return;
    }

    const requestBody = {
      summary: title || "Untitled Event",
      description: description || "",
      location: location || "",
      ...eventTimes,
      // Hidden marker so a later read-back from Google Calendar can tell
      // "this event came from the app" apart from events created directly
      // in Google Calendar by a human.
      extendedProperties: {
        private: { appEventId: event.params.eventId },
      },
    };

    try {
      const existingGoogleEventId = afterData.googleCalendarEventId;

      if (existingGoogleEventId) {
        await calendar.events.update({
          calendarId: CALENDAR_ID,
          eventId: existingGoogleEventId,
          requestBody,
        });
      } else {
        const inserted = await calendar.events.insert({
          calendarId: CALENDAR_ID,
          requestBody,
        });
        // Save the Google event ID back onto the Firestore doc, so the
        // next edit updates this same calendar event instead of creating
        // a duplicate.
        await event.data.after.ref.update({
          googleCalendarEventId: inserted.data.id,
        });
      }
    } catch (err) {
      console.error("Google Calendar sync error:", err);
    }
  },
);

// HTTP endpoint the app calls (on the Events screen load) to pull in events
// that exist in Google Calendar but were NOT created by the app itself (no
// appEventId marker) — i.e. events someone added directly in Google
// Calendar. These are now written into Firestore's "events" collection as
// real documents (not just returned for display), so they behave exactly
// like app-created events everywhere else in the app — including the
// Attendance screen, which looks events up by id in Firestore.
//
// Each Google event gets a stable Firestore doc id ("google_<googleId>"),
// so repeated calls update the same doc instead of creating duplicates.
exports.getGoogleCalendarEvents = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  try {
    const result = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: new Date().toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: "startTime",
    });

    const externalItems = (result.data.items || []).filter(
      (item) => !item.extendedProperties?.private?.appEventId,
    );

    const externalEvents = externalItems.map((item) => {
      const startDateTime = item.start?.dateTime || item.start?.date || "";
      return {
        id: `google_${item.id}`,
        title: item.summary || "Untitled Event",
        description: item.description || "",
        location: item.location || "",
        date: startDateTime.split("T")[0],
        time: item.start?.dateTime
          ? item.start.dateTime.split("T")[1].slice(0, 5)
          : "",
        group: "all",
        groupLabel: "From Google Calendar",
        voiceSection: "all_voices",
        voiceSectionLabel: "All",
        source: "google",
        googleCalendarEventId: item.id,
      };
    });

    // Persist each one into Firestore so it becomes a first-class event —
    // visible in the events table, usable for attendance, etc.
    await Promise.all(
      externalEvents.map((ev) =>
        db
          .collection("events")
          .doc(ev.id)
          .set(ev, { merge: true })
          .catch((err) =>
            console.error(
              "Failed to upsert Google event into Firestore:",
              ev.id,
              err,
            ),
          ),
      ),
    );

    res.json({ events: externalEvents });
  } catch (err) {
    console.error("getGoogleCalendarEvents error:", err);
    res.status(500).json({ error: "Failed to fetch Google Calendar events" });
  }
});

// Shares the calendar with one email address (read access), via the
// calendar's ACL (Access Control List) API. Idempotent — if the email is
// already shared, Google's "already exists" error is swallowed.
async function shareCalendarWithEmail(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return { email, ok: false, reason: "invalid email" };
  }
  try {
    await calendar.acl.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        role: "reader",
        scope: { type: "user", value: email },
      },
    });
    return { email, ok: true };
  } catch (err) {
    // Already shared with this address — not a real failure.
    if (err.code === 409 || /already exists/i.test(err.message || "")) {
      return { email, ok: true, reason: "already shared" };
    }
    console.error("shareCalendarWithEmail error:", email, err.message);
    return { email, ok: false, reason: err.message };
  }
}

// Runs automatically whenever a user document is created or updated —
// grants that user's email read access to the calendar right away, no
// manual step needed for anyone who signs up from here on.
exports.shareCalendarOnUserWrite = onDocumentWritten(
  "users/{uid}",
  async (event) => {
    const afterData = event.data.after?.data();
    if (!afterData?.email) return;
    await shareCalendarWithEmail(afterData.email);
  },
);

// One-time (or occasionally re-run) HTTP endpoint to share the calendar
// with every user already in Firestore — covers everyone who signed up
// before this automation existed. Visit the URL once in a browser to run
// it; it's safe to run more than once (skips already-shared emails).
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.shareCalendarWithAllUsers = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  try {
    const usersSnap = await db.collection("users").get();
    const results = [];
    // Sequential with a short delay between each — calling all of these
    // at once (Promise.all) was tripping Google's per-second rate limit
    // on the Calendar API once there were more than a handful of users.
    for (const doc of usersSnap.docs) {
      results.push(await shareCalendarWithEmail(doc.data().email));
      await sleep(150);
    }
    const shared = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    res.json({
      totalUsers: results.length,
      sharedCount: shared.length,
      failedCount: failed.length,
      failed,
    });
  } catch (err) {
    console.error("shareCalendarWithAllUsers error:", err);
    res.status(500).json({ error: "Failed to share calendar with users" });
  }
});

// HTTP endpoint the app calls when deleting an event that has a
// googleCalendarEventId (i.e. it's either Google-origin, or an app event
// that was already synced to Google). Deletes the actual Google Calendar
// event — without this, the next getGoogleCalendarEvents sync would just
// re-import the still-existing Google event and "resurrect" it.
exports.deleteGoogleCalendarEvent = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  const googleEventId = req.query.eventId;
  if (!googleEventId) {
    res.status(400).json({ error: "Missing eventId query param" });
    return;
  }
  try {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: googleEventId,
    });
    res.json({ success: true });
  } catch (err) {
    // 404/410 = already gone — that's fine, the end result is the same.
    if (err.code === 404 || err.code === 410) {
      res.json({ success: true, reason: "already deleted" });
      return;
    }
    console.error("deleteGoogleCalendarEvent error:", err);
    res.status(500).json({ error: "Failed to delete Google Calendar event" });
  }
});

// Generates all plausible Firestore storage variants for a Firebase phone
// auth E.164 phone number (e.g. "+972501234567").
function phoneVariants(e164) {
  const digits = e164.replace(/\D/g, ""); // "972501234567"
  const local = digits.startsWith("972") ? `0${digits.slice(3)}` : digits;
  return [
    e164,           // "+972501234567"  — what signup stores
    local,          // "0501234567"     — legacy entries without country code
    `+${digits}`,   // "+972501234567"  — same as e164 but derived independently
    digits,         // "972501234567"   — no + prefix, stored by some older paths
  ].filter((v, i, arr) => arr.indexOf(v) === i); // dedupe
}

// Callable function invoked by the app after a successful phone OTP
// verification. Accepts the phone-auth idToken (proof of phone ownership)
// and the desired new password, then updates the singer's Firebase Auth
// password via the Admin SDK — something impossible from the client alone.
exports.resetUserPassword = onCall(async (request) => {
  const { idToken, newPassword } = request.data || {};

  if (!idToken || typeof idToken !== "string") {
    throw new HttpsError("invalid-argument", "Missing verification token.");
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
  }

  // Verify the phone-auth idToken — this proves the OTP was correctly entered.
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    throw new HttpsError("unauthenticated", "Verification token is invalid or expired.");
  }

  const phoneNumber = decoded.phone_number;
  if (!phoneNumber) {
    throw new HttpsError("unauthenticated", "Token does not contain a phone number.");
  }

  // Find the singer's Firestore document by phone (trying format variants).
  const variants = phoneVariants(phoneNumber);
  let uid = null;
  for (const variant of variants) {
    const snap = await db
      .collection("users")
      .where("phone", "==", variant)
      .limit(1)
      .get();
    if (!snap.empty) {
      // Prefer the uid field; fall back to the document ID (they should be
      // identical, but the field can be missing on manually-created docs).
      uid = snap.docs[0].data().uid || snap.docs[0].id;
      break;
    }
  }

  if (!uid) {
    throw new HttpsError("not-found", "No account found for this phone number.");
  }

  // Update the singer's Firebase Auth password.
  await admin.auth().updateUser(uid, { password: newPassword });
  return { success: true };
});
