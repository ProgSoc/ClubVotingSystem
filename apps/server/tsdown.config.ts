import { execaNode } from "execa";
import { defineConfig } from "tsdown";

let isRunning = false;

export default defineConfig({
  entry: ["./src/main.ts"],
  inputOptions: {
    resolve: {
      extensionAlias: {
        ".js": [".mjs", ".js"],
      }
    }
  },
  sourcemap: true,
  onSuccess: async ({ watch }, signal) => {
    if (!watch) return;
    execaNode({
      cancelSignal: signal,
      gracefulCancel: false,
      stdout: ['inherit'],
      stderr: ['inherit'],
    })`--enable-source-maps ./dist/main.js`.then(() => {
      isRunning = false;
    }).catch(() => {
      isRunning = false;
    });
    if (isRunning) return;
    isRunning = true;
  },
});
