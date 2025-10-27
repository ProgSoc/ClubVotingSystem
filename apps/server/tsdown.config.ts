import { execaNode } from "execa";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/main.ts"],
  onSuccess: async (_conf, signal) => {
    await execaNode({
      cancelSignal: signal,
      gracefulCancel: true,
    })`./dist/main.mjs`
  },
});
