const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");

async function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server startup timed out")), 10_000);
    child.stdout.on("data", (chunk) => {
      const match = String(chunk).match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    child.once("exit", (code) => reject(new Error(`server exited with ${code}`)));
  });
}

async function request(baseUrl, pathname, payload, method = "PUT") {
  return fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

test("progress APIs reject invalid structures without replacing saved progress", async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ff14cn-test-"));
  await fs.copyFile(path.resolve(__dirname, "..", "server.js"), path.join(tempRoot, "server.js"));
  await fs.mkdir(path.join(tempRoot, "public"));
  await fs.writeFile(path.join(tempRoot, "public", "index.html"), "test", "utf8");

  const requestedPort = 43100 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ["server.js"], {
    cwd: tempRoot,
    env: { ...process.env, PORT: String(requestedPort) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  t.after(async () => {
    if (child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
    await fs.rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  const port = await waitForServer(child);
  const baseUrl = `http://127.0.0.1:${port}`;
  const valid = {
    schemaVersion: 1,
    items: {
      "minion-1": {
        owned: true,
        wanted: false,
        priority: "high",
        notes: "日本語メモ",
        updatedAt: "2026-09-10T00:00:00.000Z"
      }
    }
  };

  assert.equal((await request(baseUrl, "/api/progress", valid)).status, 200);
  for (const invalid of [null, [], { hello: "world" }, { schemaVersion: 2, items: {} }, { items: [] }, { items: { x: { owned: "yes" } } }]) {
    assert.equal((await request(baseUrl, "/api/progress", invalid)).status, 400);
  }
  assert.equal((await request(baseUrl, "/api/progress/import", { hello: "world" }, "POST")).status, 400);

  const persisted = await fetch(`${baseUrl}/api/progress`).then((response) => response.json());
  assert.equal(persisted.items["minion-1"].owned, true);
  assert.equal(persisted.items["minion-1"].priority, "high");
  assert.equal(persisted.items["minion-1"].notes, "日本語メモ");
});
