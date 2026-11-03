// node_modules のライブラリを assets/js/ にコピーし、バージョンが
// プラグイン側の定数（MTP_RT_LIB_VERSION）とそろっているか確認する。
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "node_modules", "@mt-planning", "reading-tracker");
const outDir = join(root, "assets", "js");
const files = ["reading-tracker.min.js", "reading-tracker.js"];

const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
mkdirSync(outDir, { recursive: true });
for (const f of files) {
  copyFileSync(join(pkgDir, "dist", f), join(outDir, f));
}
console.log(`Copied @mt-planning/reading-tracker v${version} to assets/js/`);

const main = readFileSync(join(root, "reading-tracker.php"), "utf8");
const m = main.match(/define\(\s*'MTP_RT_LIB_VERSION',\s*'([^']+)'/);
if (!m || m[1] !== version) {
  console.error(
    `MTP_RT_LIB_VERSION in reading-tracker.php is ${m ? m[1] : "missing"}; update it to ${version}.`
  );
  process.exitCode = 1;
}
