import mongoose from "mongoose";
import dns from "node:dns";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || "rentPE";

  if (!uri) {
    console.warn("MONGODB_URI is not set. API will use in-memory room data.");
    return false;
  }

  try {
    if (uri.startsWith("mongodb+srv://")) {
      dns.setServers((process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8").split(","));
    }

    await mongoose.connect(uri, { dbName });
    console.log(`MongoDB connected to ${mongoose.connection.name}`);
    return true;
  } catch (error) {
    console.warn(`MongoDB connection failed: ${error.message}`);
    return false;
  }
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}
