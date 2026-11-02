import { MongoClient } from "mongodb";
import "dotenv/config";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Error: MONGO_URI is not defined in .env file.");
  process.exit(1);
}

export async function cleanDemoEvents() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db("univora");
    const eventsCollection = db.collection("events");

    const result = await eventsCollection.deleteMany({ isDemo: true });
    console.log(`Cleaned up ${result.deletedCount} demo events successfully.`);
  } catch (error) {
    console.error("Cleanup failed:", error);
  } finally {
    await client.close();
  }
}

if (process.argv[1]?.endsWith("clean-demo-events.js")) {
  cleanDemoEvents();
}

