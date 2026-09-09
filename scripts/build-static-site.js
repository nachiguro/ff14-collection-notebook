const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const dataDir = path.join(rootDir, "data");
const docsDir = path.join(rootDir, "docs");
const webPublishDir = path.join(rootDir, "web-publish");
const excludedDirectoryNames = new Set(["lodestone-snapshots"]);

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      if (excludedDirectoryNames.has(entry.name)) {
        continue;
      }
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

function emptyDirectory(targetDir, preserveNames = []) {
  fs.mkdirSync(targetDir, { recursive: true });
  const preserve = new Set(preserveNames);

  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    if (preserve.has(entry.name)) {
      continue;
    }

    fs.rmSync(path.join(targetDir, entry.name), { recursive: true, force: true });
  }
}

function buildSite(targetDir, options = {}) {
  emptyDirectory(targetDir, options.preserve || []);
  copyDirectory(publicDir, targetDir);
  fs.mkdirSync(path.join(targetDir, "data"), { recursive: true });
  fs.copyFileSync(path.join(dataDir, "catalog.json"), path.join(targetDir, "data", "catalog.json"));
  fs.writeFileSync(path.join(targetDir, ".nojekyll"), "", "utf8");
}

buildSite(docsDir);
buildSite(webPublishDir, { preserve: [".git"] });

fs.writeFileSync(
  path.join(webPublishDir, "README.md"),
  [
    "# FF14 Collection Notebook",
    "",
    "Static GitHub Pages build.",
    "",
    "- Personal progress is saved in each browser's localStorage.",
    "- This folder intentionally does not include data/user-progress.json.",
    ""
  ].join("\n"),
  "utf8"
);

console.log(`Built static site: ${docsDir}`);
console.log(`Built clean publish folder: ${webPublishDir}`);
