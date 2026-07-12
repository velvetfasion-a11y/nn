/**
 * Generates firestore.rules and storage.rules from templates using .env admin values.
 * Run before: firebase deploy --only firestore:rules,storage
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ADMIN_EMAIL, ADMIN_UID } from "../server/admin-config.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

if (!ADMIN_UID || !ADMIN_EMAIL) {
  console.error("Missing ADMIN_UID or ADMIN_EMAIL in .env");
  process.exit(1);
}

const templates = [
  { template: "firestore.rules.template", output: "firestore.rules" },
  { template: "storage.rules.template", output: "storage.rules" },
];

for (const { template, output } of templates) {
  const templatePath = path.join(root, template);
  const outputPath = path.join(root, output);
  const content = readFileSync(templatePath, "utf8")
    .replace(/__ADMIN_UID__/g, ADMIN_UID)
    .replace(/__ADMIN_EMAIL__/g, ADMIN_EMAIL);

  writeFileSync(outputPath, content);
  console.log(`Wrote ${output} from ${template}`);
}
