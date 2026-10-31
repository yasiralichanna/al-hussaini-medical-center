import { writeFileSync } from "node:fs";
import { initialState } from "../modules/clinic/types";
import { passwordHash, token } from "../modules/auth/crypto";
const s = initialState();
s.settings.days = [0, 1, 2, 3, 4, 5, 6];
s.services.forEach((v) => (v.duration = 30));
const password = token();
for (const role of ["administrator", "receptionist"] as const)
  s.staff.push({
    id: crypto.randomUUID(),
    email: role + "@development.invalid",
    name: "Development QA " + role,
    role,
    active: true,
    passwordHash: await passwordHash(password),
  });
const data = JSON.stringify(s).replaceAll("'", "''");
writeFileSync(
  "outputs/qa-seed.sql",
  `INSERT INTO clinic_state (id,revision,data) VALUES ('clinic',1,'${data}') ON CONFLICT(id) DO UPDATE SET revision=revision+1,data=excluded.data;`,
);
writeFileSync("outputs/qa-access.json", JSON.stringify({ password }));
console.log(
  "Synthetic local QA fixtures prepared under ignored outputs/. Never deploy these files.",
);
