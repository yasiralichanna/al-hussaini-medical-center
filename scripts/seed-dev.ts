import { MongoClient } from "mongodb";
import { initialState } from "../modules/clinic/types";
if (
  process.env.NODE_ENV === "production" ||
  process.env.ALLOW_DEV_SEED !== "yes" ||
  !process.env.MONGODB_DB?.endsWith("_dev")
)
  throw new Error(
    "Development seed requires ALLOW_DEV_SEED=yes and a database name ending in _dev. Never run on production.",
  );
const client = new MongoClient(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
);
await client.connect();
try {
  const s = initialState();
  s.settings.days = [1, 2, 3, 4, 5, 6];
  s.services.forEach((v) => (v.duration = 30));
  await client
    .db(process.env.MONGODB_DB)
    .collection("clinic_state")
    .insertOne({ _id: "clinic" as any, revision: 1, state: s });
  console.log(
    "Development-only availability seeded. No patients or staff credentials were created.",
  );
} finally {
  await client.close();
}
