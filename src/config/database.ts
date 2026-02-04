import mongoose from "mongoose";

const cleanupObsoleteIndexes = async (): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const refreshTokensCollection = db.collection("refreshtokens");
    const indexes = await refreshTokensCollection.indexes();

    const obsoleteIndexes = indexes.filter((idx) => idx.name === "token_1");

    for (const index of obsoleteIndexes) {
      if (index.name) {
        await refreshTokensCollection.dropIndex(index.name);
        console.log(`Dropped obsolete index: ${index.name}`);
      }
    }
  } catch (error) {
    console.error("Index cleanup error:", error);
  }
};

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    await mongoose.connect(mongoURI!);

    console.log("MongoDB connected successfully");

    await cleanupObsoleteIndexes();
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err);
});
