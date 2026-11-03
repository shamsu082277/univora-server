import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt, bearer } from "better-auth/plugins";
import { toNodeHandler } from "better-auth/node";
import { z } from "zod";

const PORT = process.env.PORT || 5000;
const app = express();

const FRONTEND_URI = process.env.FRONTEND_URI || "http://localhost:3000";
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || `http://localhost:${PORT}`;

// ==========================================
// 1. CORS Configuration
// ==========================================
app.use(
  cors({
    origin: [FRONTEND_URI, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "x-requested-with"],
    exposedHeaders: ["set-auth-jwt"],
  })
);

// ==========================================
// 2. MongoDB Connection
// ==========================================
const client = new MongoClient(process.env.MONGO_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB!");
    return client;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}

const connectClient = await connectToMongoDB();
const db = connectClient.db("univora");

const usersCollection = db.collection("users");
const eventsCollection = db.collection("events");
const registrationsCollection = db.collection("registrations");

// Ensure unique index for registrations and events
try {
  await registrationsCollection.createIndex(
    { eventId: 1, userId: 1 },
    { unique: true }
  );
  await eventsCollection.createIndex({ slug: 1 }, { unique: true });
  await eventsCollection.createIndex({ category: 1 });
  await eventsCollection.createIndex({ date: 1 });
} catch (e) {
  console.log("Indexes initialized or already exist:", e.message);
}

// ==========================================
// 3. Better Auth Configuration
// ==========================================
const socialProvidersConfig = {};
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProvidersConfig.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    usePlural: true,
  }),
  baseURL: BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET || "univora_default_secret_key_change_in_production_12345",
  trustedOrigins: [FRONTEND_URI, "http://localhost:3000", "http://127.0.0.1:3000"],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: socialProvidersConfig,
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
      },
    },
  },
  plugins: [
    jwt({
      jwks: {
        keyPairConfig: {
          alg: "EdDSA",
          crv: "Ed25519",
        },
      },
    }),
    bearer(),
  ],
});

// ==========================================
// 4. JWT Verification Middleware (jose)
// ==========================================
const JWKS = createRemoteJWKSet(
  new URL(`${BETTER_AUTH_URL}/api/auth/jwks`)
);

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized access: Bearer token is missing",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: BETTER_AUTH_URL,
      audience: BETTER_AUTH_URL,
    });

    req.user = {
      ...payload,
      id: payload.sub || payload.id,
      name: payload.name,
      email: payload.email,
    };

    next();
  } catch (error) {
    // If JWKS remote fetch fails (e.g. self-referencing startup), verify using Better Auth internal verify
    try {
      const verified = await auth.api.verifyJWT({ body: { token } });
      if (verified && verified.payload) {
        req.user = {
          ...verified.payload,
          id: verified.payload.sub || verified.payload.id,
          name: verified.payload.name,
          email: verified.payload.email,
        };
        return next();
      }
    } catch {
      // Fall through to 401
    }

    return res.status(401).json({
      message: "Unauthorized access: Invalid or expired token",
    });
  }
};

// ==========================================
// Protected Authentication Test Endpoint
// GET /api/auth/me
// ==========================================
app.get(["/api/auth/me", "/auth/me"], verifyToken, async (req, res) => {
  try {
    let name = req.user.name;
    let email = req.user.email;

    if (!name || !email) {
      let dbUser = null;
      if (ObjectId.isValid(req.user.id)) {
        dbUser = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
      }
      if (!dbUser) {
        dbUser = await usersCollection.findOne({ _id: req.user.id });
      }
      if (dbUser) {
        name = name || dbUser.name;
        email = email || dbUser.email;
      }
    }

    return res.status(200).json({
      id: req.user.id,
      name: name || "User",
      email: email || "",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error while resolving user profile",
    });
  }
});

// Better Auth Routes mounted BEFORE express.json() to prevent stream consumption
app.all(["/api/auth", "/api/auth/{*splat}"], toNodeHandler(auth));

// Express body parser for all other REST APIs
app.use(express.json());

// Normalize /api prefix for REST endpoints so both /api/events and /events work
app.use((req, res, next) => {
  if (req.url.startsWith("/api/") && !req.url.startsWith("/api/auth")) {
    req.url = req.url.replace(/^\/api/, "");
  }
  next();
});

// ==========================================
// 5. Admin Verification Middleware
// ==========================================
export const verifyAdmin = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  try {
    let user = null;
    if (ObjectId.isValid(req.user.id)) {
      user = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
    }
    if (!user) {
      user = await usersCollection.findOne({ _id: req.user.id });
    }
    if (!user && req.user.email) {
      user = await usersCollection.findOne({ email: req.user.email });
    }

    if (!user || user.role !== "admin") {
      return res.status(403).send({
        message: "Forbidden: Admin privileges required",
      });
    }

    req.dbUser = user;
    next();
  } catch (error) {
    return res.status(500).send({
      message: "Server error during admin verification",
    });
  }
};

// ==========================================
// 6. Helpers & Validation Schemas
// ==========================================
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

function formatEventOutput(event, joinedUsers = []) {
  if (!event) return null;
  const id = event._id.toString();
  const locationString =
    typeof event.location === "object"
      ? [event.location?.venue, event.location?.city].filter(Boolean).join(", ") ||
        event.location?.address ||
        "TBD"
      : event.location || "TBD";

  const eventDateFormatted =
    event.date instanceof Date
      ? event.date.toISOString().split("T")[0]
      : event.eventDate || event.date || "";

  const categoryName = event.eventType || event.category || "Community Support";
  const thumbnailImg = event.thumbnail || event.coverImage || "";
  const count = event.participantCount ?? event.registeredCount ?? 0;
  const organizerDisplay =
    event.organizerName || event.organizer || "Univora Organizer";
  const organizerEmail = event.organizerEmail || "";
  const organizerId = event.organizerId || "";

  return {
    ...event,
    id,
    _id: id,
    // Frontend compatibility (IEvent)
    thumbnail: thumbnailImg,
    eventType: categoryName,
    eventDate: eventDateFormatted,
    participantCount: count,
    organizerEmail,
    organizerId,
    joinedUsers:
      joinedUsers && joinedUsers.length > 0
        ? joinedUsers
        : event.joinedUsers || [],

    // Backend compatibility
    coverImage: thumbnailImg,
    category: categoryName,
    date: eventDateFormatted,
    registeredCount: count,
    attendeesCount: count,
    location: locationString,
    locationDetails:
      typeof event.location === "object"
        ? event.location
        : { venue: locationString, city: "" },
    organizer: organizerDisplay,
    organizerName: organizerDisplay,
  };
}

const eventInputSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(150),
  description: z.string().min(10, "Description must be at least 10 characters"),
  shortDescription: z.string().optional(),
  category: z.string().optional(),
  eventType: z.string().optional(),
  coverImage: z.string().optional(),
  thumbnail: z.string().optional(),
  location: z.union([
    z.string().min(2, "Location is required"),
    z.object({
      venue: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
    }),
  ]),
  date: z.union([z.string(), z.date()]).optional(),
  eventDate: z.union([z.string(), z.date()]).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  capacity: z.coerce.number().int().positive("Capacity must be greater than 0").default(100),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(["published", "draft", "cancelled", "completed"]).optional().default("published"),
});

// ==========================================
// 7. Public Event APIs
// ==========================================

// GET / - Root Health Check
app.get("/", (req, res) => {
  res.send({
    status: "ok",
    service: "Univora API Server",
    time: new Date().toISOString(),
  });
});

// GET /events - List published events with search, filter, sort, pagination
app.get("/events", async (req, res) => {
  try {
    const { search, category, city, sort, page = 1, limit = 12 } = req.query;

    const query = { status: "published" };

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    if (category && category !== "All") {
      query.$or = [{ category: category }, { eventType: category }];
    }

    if (city) {
      const cityQuery = [
        { "location.city": { $regex: city, $options: "i" } },
        { location: { $regex: city, $options: "i" } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: cityQuery }];
        delete query.$or;
      } else {
        query.$or = cityQuery;
      }
    }

    const sortOption = {};
    if (sort === "recent" || sort === "desc" || sort === "date-desc") {
      sortOption.date = -1;
    } else {
      // Default to upcoming / date-asc
      sortOption.date = 1;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await eventsCollection.countDocuments(query);
    const rawEvents = await eventsCollection
      .find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .toArray();

    const events = rawEvents.map((e) => formatEventOutput(e));

    res.send({
      events,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).send({ message: "Failed to fetch events" });
  }
});

// GET /featured-events and /events/recent - Top 6 published events
app.get(["/featured-events", "/events/recent"], async (req, res) => {
  try {
    const rawEvents = await eventsCollection
      .find({ status: "published" })
      .sort({ date: 1 })
      .limit(6)
      .toArray();

    res.send(rawEvents.map((e) => formatEventOutput(e)));
  } catch (error) {
    console.error("Error fetching featured events:", error);
    res.status(500).send({ message: "Failed to fetch featured events" });
  }
});

// GET /event-categories - Available categories with count
app.get("/event-categories", async (req, res) => {
  try {
    const categories = [
      "Community Support",
      "Environmental Care",
      "Donation & Charity",
      "Education & Awareness",
    ];

    const counts = await eventsCollection
      .aggregate([
        { $match: { status: "published" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ])
      .toArray();

    const countMap = {};
    counts.forEach((item) => {
      countMap[item._id] = item.count;
    });

    const result = categories.map((cat) => ({
      name: cat,
      count: countMap[cat] || 0,
    }));

    res.send(result);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).send({ message: "Failed to fetch categories" });
  }
});

// GET /events/slug/:slug - Find single event by slug
app.get("/events/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const event = await eventsCollection.findOne({ slug });

    if (!event) {
      return res.status(404).send({ message: "Event not found" });
    }

    const registrations = await registrationsCollection
      .find({ eventId: event._id })
      .toArray();
    const joinedUsers = registrations.flatMap((r) => [r.userId, r.userEmail].filter(Boolean));

    res.send(formatEventOutput(event, joinedUsers));
  } catch (error) {
    console.error("Error finding event by slug:", error);
    res.status(500).send({ message: "Server error retrieving event" });
  }
});

// GET /events/:id - Find single event by ObjectId
app.get("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event ID format" });
    }

    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).send({ message: "Event not found" });
    }

    const registrations = await registrationsCollection
      .find({ eventId: new ObjectId(id) })
      .toArray();
    const joinedUsers = registrations.flatMap((r) => [r.userId, r.userEmail].filter(Boolean));

    res.send(formatEventOutput(event, joinedUsers));
  } catch (error) {
    console.error("Error finding event by ID:", error);
    res.status(500).send({ message: "Server error retrieving event" });
  }
});

// ==========================================
// 8. Protected Event APIs (verifyToken)
// ==========================================

// POST /events - Create a new event
app.post("/events", verifyToken, async (req, res) => {
  try {
    const validation = eventInputSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).send({
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const parsed = validation.data;
    const baseSlug = slugify(parsed.title);
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

    // Extract user display name & email from token or database
    let organizerName = req.user.name || "Univora Volunteer";
    let organizerEmail = req.user.email || "";
    if ((!req.user.name || !req.user.email) && ObjectId.isValid(req.user.id)) {
      const u = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
      if (u?.name) organizerName = u.name;
      if (u?.email) organizerEmail = u.email;
    }

    const locationObj =
      typeof parsed.location === "object"
        ? parsed.location
        : {
            venue: parsed.location,
            address: parsed.location,
            city: parsed.location.includes(",")
              ? parsed.location.split(",").pop().trim()
              : parsed.location,
          };

    const category = parsed.eventType || parsed.category || "Community Support";
    const coverImage = parsed.thumbnail || parsed.coverImage || "";
    const rawDate = parsed.eventDate || parsed.date || new Date();
    const dateObj = new Date(rawDate);
    const dateString = isNaN(dateObj.getTime())
      ? new Date().toISOString().split("T")[0]
      : dateObj.toISOString().split("T")[0];

    const newEvent = {
      title: parsed.title,
      slug: uniqueSlug,
      description: parsed.description,
      shortDescription: parsed.shortDescription || parsed.description.slice(0, 160),
      category: category,
      eventType: category,
      coverImage: coverImage,
      thumbnail: coverImage,
      location: locationObj,
      date: dateObj,
      eventDate: dateString,
      startTime: parsed.startTime || "09:00 AM",
      endTime: parsed.endTime || "05:00 PM",
      capacity: parsed.capacity,
      registeredCount: 0,
      participantCount: 0,
      organizerId: req.user.id,
      organizerEmail: organizerEmail,
      organizerName: organizerName,
      status: parsed.status || "published",
      tags: parsed.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await eventsCollection.insertOne(newEvent);

    res.status(201).send({
      message: "Event created successfully",
      insertedId: result.insertedId,
      event: formatEventOutput({ ...newEvent, _id: result.insertedId }),
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).send({ message: "Failed to create event" });
  }
});

// GET /my-events and /events/my-events - Get events created by authenticated user
app.get(["/my-events", "/events/my-events"], verifyToken, async (req, res) => {
  try {
    const rawEvents = await eventsCollection
      .find({
        $or: [
          { organizerId: req.user.id },
          ...(req.user.email ? [{ organizerEmail: req.user.email }] : []),
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(rawEvents.map((e) => formatEventOutput(e)));
  } catch (error) {
    console.error("Error fetching my events:", error);
    res.status(500).send({ message: "Failed to fetch your events" });
  }
});

// PATCH /events/:id - Update owned event or admin update
app.patch("/events/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event ID format" });
    }

    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).send({ message: "Event not found" });
    }

    // Check ownership or admin status
    const isOwner =
      event.organizerId === req.user.id ||
      (req.user.email && event.organizerEmail === req.user.email);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).send({
        message: "Forbidden: You can only edit your own events",
      });
    }

    // Disallow modifying protected fields
    const {
      _id,
      organizerId,
      organizerEmail,
      registeredCount,
      participantCount,
      createdAt,
      slug,
      ...allowedUpdates
    } = req.body;

    if (allowedUpdates.eventDate || allowedUpdates.date) {
      const d = new Date(allowedUpdates.eventDate || allowedUpdates.date);
      allowedUpdates.date = d;
      allowedUpdates.eventDate = isNaN(d.getTime())
        ? new Date().toISOString().split("T")[0]
        : d.toISOString().split("T")[0];
    }
    if (allowedUpdates.eventType || allowedUpdates.category) {
      const cat = allowedUpdates.eventType || allowedUpdates.category;
      allowedUpdates.category = cat;
      allowedUpdates.eventType = cat;
    }
    if (allowedUpdates.thumbnail || allowedUpdates.coverImage) {
      const thumb = allowedUpdates.thumbnail || allowedUpdates.coverImage;
      allowedUpdates.coverImage = thumb;
      allowedUpdates.thumbnail = thumb;
    }
    if (allowedUpdates.capacity) {
      allowedUpdates.capacity = Number(allowedUpdates.capacity);
    }
    if (typeof allowedUpdates.location === "string") {
      allowedUpdates.location = {
        venue: allowedUpdates.location,
        address: allowedUpdates.location,
        city: allowedUpdates.location.includes(",")
          ? allowedUpdates.location.split(",").pop().trim()
          : allowedUpdates.location,
      };
    }

    allowedUpdates.updatedAt = new Date();

    await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: allowedUpdates }
    );

    const updatedEvent = await eventsCollection.findOne({ _id: new ObjectId(id) });
    res.send({
      message: "Event updated successfully",
      event: formatEventOutput(updatedEvent),
    });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).send({ message: "Failed to update event" });
  }
});

// DELETE /events/:id - Delete owned event or admin delete
app.delete("/events/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event ID format" });
    }

    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).send({ message: "Event not found" });
    }

    const isOwner =
      event.organizerId === req.user.id ||
      (req.user.email && event.organizerEmail === req.user.email);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).send({
        message: "Forbidden: You can only delete your own events",
      });
    }

    // Delete event
    await eventsCollection.deleteOne({ _id: new ObjectId(id) });

    // Clean up all registrations for this event
    await registrationsCollection.deleteMany({ eventId: new ObjectId(id) });

    res.send({
      success: true,
      message: "Event and associated registrations deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).send({ message: "Failed to delete event" });
  }
});

// ==========================================
// 9. Event Registration APIs
// ==========================================

// POST /events/:id/join - Register to join an event
app.post("/events/:id/join", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event ID format" });
    }

    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).send({ message: "Event not found" });
    }

    if (event.status === "cancelled" || event.status === "completed") {
      return res.status(400).send({
        message: `Cannot register for a ${event.status} event`,
      });
    }

    // Check capacity
    const currentCount = event.participantCount ?? event.registeredCount ?? 0;
    if (event.capacity && currentCount >= event.capacity) {
      return res.status(400).send({
        message: "This event has reached its maximum volunteer capacity",
      });
    }

    // Check existing registration
    const existingRegistration = await registrationsCollection.findOne({
      eventId: new ObjectId(id),
      $or: [
        { userId: req.user.id },
        ...(req.user.email ? [{ userEmail: req.user.email }] : []),
      ],
    });

    if (existingRegistration) {
      return res.status(400).send({
        message: "You are already registered for this event",
      });
    }

    // Atomic update to increment participantCount
    const updateQuery = {
      _id: new ObjectId(id),
    };
    if (event.capacity) {
      updateQuery.$or = [
        { participantCount: { $lt: event.capacity } },
        { registeredCount: { $lt: event.capacity } },
        { participantCount: { $exists: false } },
      ];
    }

    const updateResult = await eventsCollection.updateOne(
      updateQuery,
      {
        $inc: { participantCount: 1, registeredCount: 1 },
        $set: { updatedAt: new Date() },
      }
    );

    if (event.capacity && updateResult.modifiedCount === 0) {
      return res.status(400).send({
        message: "Event has just reached full capacity",
      });
    }

    // Insert registration record
    const registrationRecord = {
      eventId: new ObjectId(id),
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name || "Volunteer",
      status: "registered",
      registeredAt: new Date(),
    };

    const result = await registrationsCollection.insertOne(registrationRecord);
    const updatedEvent = await eventsCollection.findOne({ _id: new ObjectId(id) });

    res.status(201).send({
      success: true,
      message: "Successfully joined the event!",
      registrationId: result.insertedId,
      registration: registrationRecord,
      event: formatEventOutput(updatedEvent),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).send({
        message: "You are already registered for this event",
      });
    }
    console.error("Error joining event:", error);
    res.status(500).send({ message: "Failed to register for the event" });
  }
});

// DELETE /events/:id/join - Cancel registration
app.delete("/events/:id/join", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event ID format" });
    }

    const registration = await registrationsCollection.findOne({
      eventId: new ObjectId(id),
      $or: [
        { userId: req.user.id },
        ...(req.user.email ? [{ userEmail: req.user.email }] : []),
      ],
    });

    if (!registration) {
      return res.status(404).send({
        message: "You are not registered for this event",
      });
    }

    // Delete registration
    await registrationsCollection.deleteOne({ _id: registration._id });

    // Decrement count
    await eventsCollection.updateOne(
      {
        _id: new ObjectId(id),
        $or: [{ participantCount: { $gt: 0 } }, { registeredCount: { $gt: 0 } }],
      },
      {
        $inc: { participantCount: -1, registeredCount: -1 },
        $set: { updatedAt: new Date() },
      }
    );

    res.send({
      success: true,
      message: "Your registration has been cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling registration:", error);
    res.status(500).send({ message: "Failed to cancel registration" });
  }
});

// GET /events/:id/registrations - View attendees (Organizer or Admin only)
app.get("/events/:id/registrations", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid event ID format" });
    }

    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).send({ message: "Event not found" });
    }

    const isOwner =
      event.organizerId === req.user.id ||
      (req.user.email && event.organizerEmail === req.user.email);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).send({
        message: "Forbidden: Only event organizers or admins can view attendee lists",
      });
    }

    const attendees = await registrationsCollection
      .find({ eventId: new ObjectId(id) })
      .sort({ registeredAt: -1 })
      .toArray();

    res.send({
      eventId: id,
      eventTitle: event.title,
      totalAttendees: attendees.length,
      capacity: event.capacity,
      attendees,
    });
  } catch (error) {
    console.error("Error fetching event registrations:", error);
    res.status(500).send({ message: "Failed to fetch event attendees" });
  }
});

// GET /my-joined-events, /events/my-joined - List of events authenticated user has joined
app.get(
  ["/my-joined-events", "/events/my-joined", "/events/my-joined-events"],
  verifyToken,
  async (req, res) => {
    try {
      const userRegistrations = await registrationsCollection
        .find({
          $or: [
            { userId: req.user.id },
            ...(req.user.email ? [{ userEmail: req.user.email }] : []),
          ],
        })
        .sort({ registeredAt: -1 })
        .toArray();

      if (!userRegistrations.length) {
        return res.send([]);
      }

      const eventIds = userRegistrations.map((r) => r.eventId);
      const events = await eventsCollection
        .find({ _id: { $in: eventIds } })
        .toArray();

      const registrationMap = new Map();
      userRegistrations.forEach((r) => {
        registrationMap.set(r.eventId.toString(), r);
      });

      const enrichedEvents = events.map((event) => {
        const formatted = formatEventOutput(event);
        const reg = registrationMap.get(event._id.toString());
        return {
          ...formatted,
          registrationId: reg?._id,
          registeredAt: reg?.registeredAt,
          registrationStatus: reg?.status || "registered",
        };
      });

      res.send(enrichedEvents);
    } catch (error) {
      console.error("Error fetching joined events:", error);
      res.status(500).send({ message: "Failed to fetch your joined events" });
    }
  }
);

// ==========================================
// 10. User Profile APIs
// ==========================================

// GET /users/me - Current user profile
app.get("/users/me", verifyToken, async (req, res) => {
  try {
    let user = null;
    if (ObjectId.isValid(req.user.id)) {
      user = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
    }
    if (!user) {
      user = await usersCollection.findOne({ _id: req.user.id });
    }
    if (!user && req.user.email) {
      user = await usersCollection.findOne({ email: req.user.email });
    }

    if (!user) {
      return res.status(404).send({ message: "User profile not found" });
    }

    const { password, ...safeUser } = user;
    res.send({
      ...safeUser,
      id: user._id.toString(),
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).send({ message: "Failed to fetch profile" });
  }
});

// PATCH /users/me - Update user profile
app.patch("/users/me", verifyToken, async (req, res) => {
  try {
    const { name, image, bio, phone, city } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (image !== undefined) updates.image = image.trim();
    if (bio !== undefined) updates.bio = bio.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (city !== undefined) updates.city = city.trim();
    updates.updatedAt = new Date();

    const query = ObjectId.isValid(req.user.id)
      ? { $or: [{ _id: new ObjectId(req.user.id) }, { _id: req.user.id }] }
      : { _id: req.user.id };

    await usersCollection.updateOne(query, { $set: updates });

    const updated = await usersCollection.findOne(query);
    const { password, ...safeUser } = updated || {};

    res.send({
      message: "Profile updated successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send({ message: "Failed to update profile" });
  }
});

// Aliases as requested in specification
app.get("/users/me/created-events", verifyToken, async (req, res) => {
  const rawEvents = await eventsCollection
    .find({ organizerId: req.user.id })
    .sort({ createdAt: -1 })
    .toArray();
  res.send(rawEvents.map(formatEventOutput));
});

app.get("/users/me/joined-events", verifyToken, async (req, res) => {
  const userRegistrations = await registrationsCollection
    .find({ userId: req.user.id })
    .sort({ registeredAt: -1 })
    .toArray();

  if (!userRegistrations.length) return res.send([]);

  const eventIds = userRegistrations.map((r) => r.eventId);
  const events = await eventsCollection
    .find({ _id: { $in: eventIds } })
    .toArray();

  res.send(events.map(formatEventOutput));
});

// ==========================================
// 11. Admin Endpoints (verifyToken + verifyAdmin)
// ==========================================

// GET /admin/users - List users
app.get("/admin/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await usersCollection
      .find({}, { projection: { password: 0 } })
      .toArray();

    res.send(
      users.map((u) => ({
        ...u,
        id: u._id.toString(),
      }))
    );
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch users" });
  }
});

// PATCH /admin/users/:id/role - Update user role
app.patch("/admin/users/:id/role", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).send({ message: "Role must be 'user' or 'admin'" });
    }

    const query = ObjectId.isValid(id)
      ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
      : { _id: id };

    await usersCollection.updateOne(query, {
      $set: { role, updatedAt: new Date() },
    });

    res.send({ message: `User role updated to ${role}` });
  } catch (error) {
    res.status(500).send({ message: "Failed to update user role" });
  }
});

// GET /admin/events - List all events without status filter
app.get("/admin/events", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const allEvents = await eventsCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.send(allEvents.map(formatEventOutput));
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch admin events" });
  }
});

// ==========================================
// 12. Server Startup
// ==========================================
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Better Auth available at ${BETTER_AUTH_URL}/api/auth`);
});
