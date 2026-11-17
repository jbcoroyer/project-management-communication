import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const version = process.argv[2] || "0.1.4";
const fileName = `Tuesday-Setup-${version}.exe`;
const filePath = path.join(__dirname, "..", "desktop-dist", fileName);

const buf = fs.readFileSync(filePath);
const sha = crypto.createHash("sha512").update(buf).digest("base64");
const size = buf.length;
const yml = `version: ${version}
files:
  - url: ${fileName}
    sha512: ${sha}
    size: ${size}
path: ${fileName}
sha512: ${sha}
releaseDate: '${new Date().toISOString()}'
`;

const out = path.join(__dirname, "..", "desktop-dist", "latest.yml");
fs.writeFileSync(out, yml);
console.log(yml);
