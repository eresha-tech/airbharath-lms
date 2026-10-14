import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("Next image optimizer completes concurrent AVIF and WebP requests without a native crash", () => {
  // Isolate native loading: a segfault must fail this test rather than kill the runner.
  const result = spawnSync(process.execPath, ["-e", `
    const { optimizeImage } = require("next/dist/server/image-optimizer");
    const buffer = require("node:fs").readFileSync("app/apple-icon.png");
    Promise.all(["image/avif", "image/webp"].flatMap(contentType =>
      Array.from({ length: 12 }, () => optimizeImage({
        buffer, contentType, quality: 75, width: 128
      }))
    )).then(images => {
      if (images.length !== 24 || images.some(image => image.length === 0)) {
        throw new Error("Missing optimized image output");
      }
      console.log("OPTIMIZER_PASS:24");
    }).catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
  `], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
    timeout: 20_000,
    env: { PATH: process.env.PATH, NODE_ENV: "test" },
  });

  assert.ifError(result.error);
  assert.equal(result.signal, null, `Optimizer terminated by ${result.signal}: ${result.stderr}`);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OPTIMIZER_PASS:24/);
});
