const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const { ironSession } = require("iron-session/express");

const app = express();

app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));

const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const cookieSameSite = process.env.COOKIE_SAMESITE || "lax";
const sessionPassword =
  process.env.SESSION_PASSWORD || "dev_password_32_chars_long_dev_password";

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true
  })
);

app.use(
  ironSession({
    cookieName: process.env.SESSION_COOKIE_NAME || "calendar_session",
    password: sessionPassword,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: cookieSameSite,
      httpOnly: true
    }
  })
);

const oauth2Client = () =>
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

const ensureConfigured = (req, res, next) => {
  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "GOOGLE_CALENDAR_ID",
    "SESSION_PASSWORD"
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    return res.status(500).json({
      error: "Missing server configuration",
      missing
    });
  }
  return next();
};

const requireAuth = (req, res, next) => {
  if (!req.session.tokens) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return next();
};

const getCalendarClient = async (req) => {
  const client = oauth2Client();
  client.setCredentials(req.session.tokens);
  await client.getAccessToken();
  req.session.tokens = {
    ...req.session.tokens,
    ...client.credentials
  };
  await req.session.save();
  return google.calendar({ version: "v3", auth: client });
};

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/auth/google", ensureConfigured, (req, res) => {
  const client = oauth2Client();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar", "openid", "email"],
    include_granted_scopes: true
  });
  res.redirect(url);
});

app.get("/auth/google/callback", ensureConfigured, async (req, res) => {
  const client = oauth2Client();
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("Missing code");
  }

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const userInfo = await oauth2.userinfo.get();

  req.session.tokens = tokens;
  req.session.user = {
    email: userInfo.data.email
  };
  await req.session.save();

  res.redirect(frontendOrigin);
});

app.get("/auth/me", (req, res) => {
  if (!req.session.tokens) {
    return res.json({ authenticated: false });
  }
  return res.json({
    authenticated: true,
    email: req.session.user?.email
  });
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get("/events", ensureConfigured, requireAuth, async (req, res) => {
  try {
    const calendar = await getCalendarClient(req);
    const { start, end } = req.query;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    const response = await calendar.events.list({
      calendarId,
      timeMin: typeof start === "string" ? start : undefined,
      timeMax: typeof end === "string" ? end : undefined,
      singleEvents: true,
      orderBy: "startTime"
    });

    const events = (response.data.items || [])
      .filter((event) => event.status !== "cancelled")
      .map((event) => ({
        id: event.id,
        title: event.summary || "(No title)",
        description: event.description || "",
        attendees: (event.attendees || [])
          .map((attendee) => attendee.email)
          .filter(Boolean),
        startUtc: event.start?.dateTime || `${event.start?.date}T00:00:00.000Z`,
        endUtc: event.end?.dateTime || `${event.end?.date}T00:00:00.000Z`
      }));

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to load events" });
  }
});

app.post("/events", ensureConfigured, requireAuth, async (req, res) => {
  try {
    const calendar = await getCalendarClient(req);
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const { title, description, attendees, startUtc, endUtc } = req.body;

    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: title,
        description: description || "",
        attendees: (attendees || []).map((email) => ({ email })),
        start: {
          dateTime: startUtc,
          timeZone: "UTC"
        },
        end: {
          dateTime: endUtc,
          timeZone: "UTC"
        }
      }
    });

    res.json({
      id: response.data.id,
      title: response.data.summary,
      description: response.data.description || "",
      attendees: (response.data.attendees || [])
        .map((attendee) => attendee.email)
        .filter(Boolean),
      startUtc: response.data.start?.dateTime,
      endUtc: response.data.end?.dateTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to create event" });
  }
});

app.patch("/events/:id", ensureConfigured, requireAuth, async (req, res) => {
  try {
    const calendar = await getCalendarClient(req);
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const { title, description, attendees, startUtc, endUtc } = req.body;

    const response = await calendar.events.patch({
      calendarId,
      eventId: req.params.id,
      requestBody: {
        summary: title,
        description: description || "",
        attendees: (attendees || []).map((email) => ({ email })),
        start: {
          dateTime: startUtc,
          timeZone: "UTC"
        },
        end: {
          dateTime: endUtc,
          timeZone: "UTC"
        }
      }
    });

    res.json({
      id: response.data.id,
      title: response.data.summary,
      description: response.data.description || "",
      attendees: (response.data.attendees || [])
        .map((attendee) => attendee.email)
        .filter(Boolean),
      startUtc: response.data.start?.dateTime,
      endUtc: response.data.end?.dateTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to update event" });
  }
});

app.delete("/events/:id", ensureConfigured, requireAuth, async (req, res) => {
  try {
    const calendar = await getCalendarClient(req);
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    await calendar.events.delete({ calendarId, eventId: req.params.id });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to delete event" });
  }
});

module.exports = app;
