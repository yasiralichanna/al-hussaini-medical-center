import { MongoClient } from "mongodb";
import type { State } from "../../modules/clinic/types";
let client: MongoClient;
async function collection() {
  if (!process.env.MONGODB_URI)
    throw new Error("Database is not configured. Call the clinic.");
  client ??= new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  return client
    .db(process.env.MONGODB_DB || "al_hussaini")
    .collection<{ _id: string; revision: number; state: State }>(
      "clinic_state",
    );
}
export async function readRecord() {
  return (await collection()).findOne({ _id: "clinic" });
}
export async function compareAndSwap(revision: number | null, state: State) {
  const c = await collection();
  if (revision === null) {
    try {
      await c.insertOne({ _id: "clinic", revision: 1, state });
      return true;
    } catch (e: any) {
      if (e.code === 11000) return false;
      throw e;
    }
  }
  return (
    (
      await c.updateOne(
        { _id: "clinic", revision },
        { $set: { state }, $inc: { revision: 1 } },
      )
    ).modifiedCount === 1
  );
}
