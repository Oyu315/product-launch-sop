import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const projectRoot = process.cwd();

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
        WRANGLER_WRITE_LOGS: "false",
        MINIFLARE_REGISTRY_PATH: ".wrangler/registry",
        ...extraEnv,
      },
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed: ${command} ${args.join(" ")}`));
    });
    child.on("error", reject);
  });
}

const node = process.execPath;

await run(node, ["./node_modules/vinext/dist/cli.js", "build"]);
await run(node, ["./node_modules/vite/bin/vite.js", "build", "--config", "vite.pages.config.ts"], {
  PAGES_BASE: "/spa/",
});

const spaTarget = path.join(projectRoot, "dist", "client", "spa");
await rm(spaTarget, { recursive: true, force: true });
await cp(path.join(projectRoot, "pages-dist"), spaTarget, { recursive: true });
