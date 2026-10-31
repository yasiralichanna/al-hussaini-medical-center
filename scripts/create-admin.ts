import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import { initialState } from "../modules/clinic/types";
import { passwordHash } from "../modules/auth/crypto";
// Password enters over stdin; never place it in command arguments or source.
const email = process.env.ADMIN_EMAIL,
  name = process.env.ADMIN_NAME || "Clinic administrator";
if (!process.env.MONGODB_URI || !email || !/^\S+@\S+\.\S+$/.test(email))
  throw new Error(
    "Set MONGODB_URI and ADMIN_EMAIL. Pass the password through stdin.",
  );
const password = readFileSync(0, "utf8").trim();
if (password.length < 14 || password.length > 200)
  throw new Error("Password must be 14–200 characters.");
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
try {
  const c = client.db(process.env.MONGODB_DB || "al_hussaini").collection<{
    _id: string;
    revision: number;
    state: ReturnType<typeof initialState>;
  }>("clinic_state");
  for (let i = 0; i < 32; i++) {
    const row = await c.findOne({ _id: "clinic" });
    const state = row?.state ?? initialState();
    if (state.staff.length)
      throw new Error(
        "Initial administrator already exists. Use the administrator dashboard to create staff.",
      );
    state.staff.push({
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      name,
      role: "administrator",
      active: true,
      passwordHash: await passwordHash(password),
    });
    if (!row) {
      try {
        await c.insertOne({ _id: "clinic", revision: 1, state });
        console.log("Administrator created. Sign in at /admin.");
        break;
      } catch (e: any) {
        if (e.code === 11000) continue;
        throw e;
      }
    } else if (
      (
        await c.updateOne(
          { _id: "clinic", revision: row.revision },
          { $set: { state }, $inc: { revision: 1 } },
        )
      ).modifiedCount
    ) {
      console.log("Administrator created. Sign in at /admin.");
      break;
    }
  }
} finally {
  await client.close();
}
