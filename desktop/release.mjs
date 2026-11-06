/**
 * Prépare une release desktop :
 * 1. Incrémente la version patch (ou prend --version=x.y.z)
 * 2. Affiche les commandes git / CI à lancer
 *
 * Usage :
 *   node desktop/release.mjs
 *   node desktop/release.mjs --version=0.2.0
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const argVersion = process.argv
  .find((a) => a.startsWith("--version="))
  ?.slice("--version=".length);

function bumpPatch(version) {
  const parts = version.split(".").map((n) => Number(n));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Version invalide : ${version}`);
  }
  parts[2] += 1;
  return parts.join(".");
}

const next = argVersion || bumpPatch(pkg.version);
pkg.version = next;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const tag = `desktop-v${next}`;

console.log(`
Version desktop → ${next}
Tag             → ${tag}

Ensuite :
  1. Commit les changements desktop (dont package.json)
  2. git tag ${tag}
  3. git push && git push origin ${tag}

→ GitHub Actions « Desktop Release » publie le Setup.exe
→ Les PC Windows déjà installés proposent la mise à jour tout seuls

Note : les modifs UI / métier déployées sur Vercel sont déjà live
sans nouveau Setup (l’app bureau charge le site). Un nouveau
Setup n’est utile que pour le shell Electron (fenêtre, updater, etc.).
`);
