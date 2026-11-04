// 配布用 zip（build/reading-tracker-<version>.zip）を作る。
// 入れるのは git で管理しているファイルのうち、.distignore に書いていないものだけ。
// 中身はコミット前の作業ツリーの内容になる（未追跡のファイルは入らない）。
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SLUG = "reading-tracker";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = join(root, "build");
const stageDir = join(buildDir, SLUG);

const header = readFileSync(join(root, `${SLUG}.php`), "utf8");
const version = (header.match(/^\s*\*\s*Version:\s*(\S+)/m) || [])[1];
if (!version) throw new Error(`Version header not found in ${SLUG}.php`);

// .distignore: 1行1パターン。"*" を含む行はファイル名に、それ以外はパスのいずれかの区切りに一致させる。
const patterns = readFileSync(join(root, ".distignore"), "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")}$`));
const ignored = (file) => file.split("/").some((part) => patterns.some((re) => re.test(part)));

const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .filter((f) => !ignored(f));

rmSync(stageDir, { recursive: true, force: true });
for (const f of files) {
  mkdirSync(dirname(join(stageDir, f)), { recursive: true });
  copyFileSync(join(root, f), join(stageDir, f));
}

const zipName = `${SLUG}-${version}.zip`;
const zipPath = join(buildDir, zipName);
rmSync(zipPath, { force: true });
if (process.platform === "win32") {
  // Windows 標準の bsdtar（Git Bash の GNU tar は zip を作れないので、フルパスで呼ぶ）
  const tar = join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");
  execFileSync(tar, ["-a", "-c", "-f", zipName, SLUG], { cwd: buildDir, stdio: "inherit" });
} else {
  execFileSync("zip", ["-rq", zipName, SLUG], { cwd: buildDir, stdio: "inherit" });
}
rmSync(stageDir, { recursive: true, force: true });

console.log(`build/${zipName}（${files.length} files）`);
for (const f of files) console.log(`  ${SLUG}/${f}`);
