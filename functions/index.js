const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { google } = require("googleapis");
const path = require("path");

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
exports.syncEventToGoogleCalendar = onDocumentWritten(
  "events/{eventId}",
  async (event) => {
    const afterData = event.data.after?.data();

    // Document was deleted — nothing to sync.
    if (!afterData) return;

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

// HTTP endpoint the app calls to read events that exist in Google Calendar
// but were NOT created by the app itself (no appEventId marker) — i.e.
// events someone added directly in Google Calendar, which should now also
// show up inside the app's own calendar view.
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

    const externalEvents = (result.data.items || [])
      .filter((item) => !item.extendedProperties?.private?.appEventId)
      .map((item) => {
        const startDateTime = item.start?.dateTime || item.start?.date || "";
        return {
          id: item.id,
          title: item.summary || "Untitled Event",
          description: item.description || "",
          location: item.location || "",
          date: startDateTime.split("T")[0],
          time: item.start?.dateTime
            ? item.start.dateTime.split("T")[1].slice(0, 5)
            : "",
          groupLabel: "From Google Calendar",
          group: "all",
          source: "google",
        };
      });

    res.json({ events: externalEvents });
  } catch (err) {
    console.error("getGoogleCalendarEvents error:", err);
    res.status(500).json({ error: "Failed to fetch Google Calendar events" });
  }
});
