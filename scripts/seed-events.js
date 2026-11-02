import { MongoClient } from "mongodb";
import "dotenv/config";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Error: MONGO_URI is not defined in .env file.");
  process.exit(1);
}

export const demoEvents = [
  {
    title: "Shitarto Manusher Pashe: Winter Warmth Drive",
    slug: "shitarto-manusher-pashe-winter-warmth-drive",
    eventType: "Winter Clothes Distribution",
    category: "Winter Clothes Distribution",
    location: "Kurigram Sadar & Chilmari Ghat, Rangpur",
    eventDate: "2026-11-20T09:00:00.000Z",
    date: new Date("2026-11-20T09:00:00.000Z"),
    thumbnail: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80",
    organizerName: "Tanvir Hasan",
    organizerEmail: "tanvir.hasan@example.com",
    organizerId: "demo-organizer-tanvir",
    capacity: 150,
    participantCount: 42,
    registeredCount: 42,
    status: "published",
    isDemo: true,
    description: "Collecting, sorting, and delivering heavy winter blankets, thermal shawls, and children's jackets to vulnerable farming families across Kurigram river char communities.",
    shortDescription: "Delivering winter clothes and blankets to river char families in Kurigram.",
    joinedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Sobuj Shobuj Dhaka: Urban Rooftop & Canal Tree Drive",
    slug: "sobuj-shobuj-dhaka-urban-tree-drive",
    eventType: "Tree Plantation",
    category: "Tree Plantation",
    location: "Hatirjheel Promenade & Banasree Canal, Dhaka",
    eventDate: "2026-11-25T08:30:00.000Z",
    date: new Date("2026-11-25T08:30:00.000Z"),
    thumbnail: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
    organizerName: "Nusrat Jahan",
    organizerEmail: "nusrat.jahan@example.com",
    organizerId: "demo-organizer-nusrat",
    capacity: 200,
    participantCount: 128,
    registeredCount: 128,
    status: "published",
    isDemo: true,
    description: "Planting 1,200 native fruit and shade trees along Hatirjheel walkways and residential school corridors to improve city air quality and shade canopy.",
    shortDescription: "Planting native trees to restore urban biodiversity in Dhaka.",
    joinedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Aharer Shondhane: Friday Warm Meal Feeding Program",
    slug: "aharer-shondhane-friday-warm-meal-program",
    eventType: "Food Distribution",
    category: "Food Distribution",
    location: "Kamalapur Railway Station Perimeter, Dhaka",
    eventDate: "2026-11-27T11:30:00.000Z",
    date: new Date("2026-11-27T11:30:00.000Z"),
    thumbnail: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80",
    organizerName: "Rahim Ahmed",
    organizerEmail: "rahim.ahmed@example.com",
    organizerId: "demo-organizer-rahim",
    capacity: 120,
    participantCount: 85,
    registeredCount: 85,
    status: "published",
    isDemo: true,
    description: "Cooking and distributing 600 fresh khichuri and egg meal boxes for homeless day-laborers, rickshaw pullers, and street children around Kamalapur station.",
    shortDescription: "Freshly cooked warm meal distribution for homeless day laborers.",
    joinedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Karnafuli Shoreline Plastic & Debris Cleanup",
    slug: "karnafuli-shoreline-plastic-cleanup",
    eventType: "Environmental Cleanup",
    category: "Environmental Cleanup",
    location: "Patenga Naval Beach & Karnafuli Estuary, Chattogram",
    eventDate: "2026-12-02T08:00:00.000Z",
    date: new Date("2026-12-02T08:00:00.000Z"),
    thumbnail: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80",
    organizerName: "Mahmudul Hasan",
    organizerEmail: "mahmudul.hasan@example.com",
    organizerId: "demo-organizer-mahmudul",
    capacity: 180,
    participantCount: 94,
    registeredCount: 94,
    status: "published",
    isDemo: true,
    description: "Mobilizing youth volunteers and fishermen to clear single-use plastics, nylon fishing nets, and marine debris from the coastal shoreline of Patenga beach.",
    shortDescription: "Coastal marine debris cleanup along Patenga shore.",
    joinedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Alo Chhorao: Primary School Book & Stationery Drive",
    slug: "alo-chhorao-primary-school-book-drive",
    eventType: "Education",
    category: "Education",
    location: "Shibpur Rural Government Primary School, Narsingdi",
    eventDate: "2026-12-06T10:00:00.000Z",
    date: new Date("2026-12-06T10:00:00.000Z"),
    thumbnail: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
    organizerName: "Sadia Islam",
    organizerEmail: "sadia.islam@example.com",
    organizerId: "demo-organizer-sadia",
    capacity: 100,
    participantCount: 62,
    registeredCount: 62,
    status: "published",
    isDemo: true,
    description: "Delivering backpacks, notebook sets, drawing kits, and Bengali storybooks to 250 underprivileged primary students in rural Narsingdi.",
    shortDescription: "Distributing school bags and books to rural students.",
    joinedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Protidin Shastho: Free Rural Diabetes & Blood Pressure Camp",
    slug: "protidin-shastho-free-rural-health-camp",
    eventType: "Health & Awareness",
    category: "Health & Awareness",
    location: "Kandirpar Community Center, Cumilla",
    eventDate: "2026-12-10T09:00:00.000Z",
    date: new Date("2026-12-10T09:00:00.000Z"),
    thumbnail: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80",
    organizerName: "Arif Hossain",
    organizerEmail: "arif.hossain@example.com",
    organizerId: "demo-organizer-arif",
    capacity: 250,
    participantCount: 170,
    registeredCount: 170,
    status: "published",
    isDemo: true,
    description: "Providing free blood glucose screenings, hypertension checks, doctor consultations, and generic emergency medicines for senior villagers.",
    shortDescription: "Free preventive health checkups and basic medicines in Cumilla.",
    joinedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Surma Basin Monsoon Flood Relief Preparation",
    slug: "surma-basin-monsoon-flood-relief-prep",
    eventType: "Disaster Relief",
    category: "Disaster Relief",
    location: "Gowainghat Upazila High School Field, Sylhet",
    eventDate: "2026-12-14T09:30:00.000Z",
    date: new Date("2026-12-14T09:30:00.000Z"),
    thumbnail: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80",
    organizerName: "Tasnim Rahman",
    organizerEmail: "tasnim.rahman@example.com",
    organizerId: "demo-organizer-tasnim",
    capacity: 160,
    participantCount: 110,
    registeredCount: 110,
    status: "published",
    isDemo: true,
    description: "Packing dry rations, water purification tablets, oral saline packets, and first-aid supply kits for flood-vulnerable wetlands communities.",
    shortDescription: "Emergency disaster relief and clean water supplies for flood zones.",
    joinedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Sitalakhya Riverbank Beautification & Waste Separation Drive",
    slug: "sitalakhya-riverbank-waste-separation-drive",
    eventType: "Environmental Cleanup",
    category: "Environmental Cleanup",
    location: "Bandar Ferry Ghat & Riverwalk, Narayanganj",
    eventDate: "2026-12-18T08:00:00.000Z",
    date: new Date("2026-12-18T08:00:00.000Z"),
    thumbnail: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80",
    organizerName: "Farhana Akter",
    organizerEmail: "farhana.akter@example.com",
    organizerId: "demo-organizer-farhana",
    capacity: 120,
    participantCount: 73,
    registeredCount: 73,
    status: "published",
    isDemo: true,
    description: "Engaging riverside factory communities and volunteers in segregating industrial plastic waste and installing public metal recycling bins.",
    shortDescription: "Plastic waste collection and segregation along Sitalakhya river.",
    joinedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Amader Gram: Rural Youth Vocational Skill Lab",
    slug: "amader-gram-rural-youth-vocational-skill-lab",
    eventType: "Community Support",
    category: "Community Support",
    location: "Joydebpur Technical Training Grounds, Gazipur",
    eventDate: "2026-12-22T10:00:00.000Z",
    date: new Date("2026-12-22T10:00:00.000Z"),
    thumbnail: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
    organizerName: "Tanvir Hasan",
    organizerEmail: "tanvir.hasan@example.com",
    organizerId: "demo-organizer-tanvir",
    capacity: 80,
    participantCount: 54,
    registeredCount: 54,
    status: "published",
    isDemo: true,
    description: "Hands-on basic electrical repair, solar lantern maintenance, and digital resume workshops for semi-urban school leavers seeking apprenticeship.",
    shortDescription: "Vocational and electrical repair training for rural youth.",
    joinedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Padma Char Warmth & Nutrition Drive",
    slug: "padma-char-warmth-nutrition-drive",
    eventType: "Donation Drive",
    category: "Donation Drive",
    location: "Godagari River Ghat & Remote Chars, Rajshahi",
    eventDate: "2026-12-28T09:00:00.000Z",
    date: new Date("2026-12-28T09:00:00.000Z"),
    thumbnail: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80",
    organizerName: "Rahim Ahmed",
    organizerEmail: "rahim.ahmed@example.com",
    organizerId: "demo-organizer-rahim",
    capacity: 140,
    participantCount: 88,
    registeredCount: 88,
    status: "published",
    isDemo: true,
    description: "Boating essential winter clothing, fortified infant milk, and hygiene care kits to isolated river island homesteads along the Padma river.",
    shortDescription: "Essential nutrition and winter clothing aid for Padma char families.",
    joinedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export async function seedEvents() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log("Connected to MongoDB for event seeding...");

    const db = client.db("univora");
    const eventsCollection = db.collection("events");

    let insertedCount = 0;
    let skippedCount = 0;

    for (const event of demoEvents) {
      // Use slug as the stable unique key to prevent duplicate records
      const existing = await eventsCollection.findOne({ slug: event.slug });
      if (!existing) {
        await eventsCollection.insertOne(event);
        insertedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`Seeding complete: ${insertedCount} inserted, ${skippedCount} skipped (already exist).`);
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await client.close();
  }
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith("seed-events.js")) {
  seedEvents();
}

