#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const skillName = "taskflow";

function codexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

function targetPaths() {
  return {
    codex: path.join(codexHome(), "skills", skillName),
    "codex-legacy": path.join(os.homedir(), ".codex", "skills", skillName),
    claude: path.join(os.homedir(), ".claude", "skills", skillName),
    hermes: path.join(os.homedir(), ".hermes", "skills", "productivity", skillName)
  };
}

const skillEntries = ["SKILL.md", "references", "agents"];

function usage(exitCode = 0) {
  const command = path.basename(process.argv[1]);
  console.log(`Usage:
  ${command} install [--target all|codex|codex-legacy|claude|hermes] [--force]
  ${command} install --dir <path> [--force]
  ${command} sync-layout
  ${command} paths

Examples:
  ${command} install --target all
  ${command} install --target claude
  ${command} install --dir ~/.codex/skills/taskflow
`);
  process.exit(exitCode);
}

function expandHome(input) {
  if (!input) return input;
  if (input === "~") return os.homedir();
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

function parseArgs(argv) {
  if (argv[2] === "--help" || argv[2] === "-h") {
    usage(0);
  }

  const opts = {
    command: argv[2] || "help",
    target: "all",
    dir: null,
    force: false
  };

  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--target" || arg === "-t") {
      opts.target = argv[++i];
    } else if (arg === "--dir") {
      opts.dir = expandHome(argv[++i]);
    } else if (arg === "--force" || arg === "-f") {
      opts.force = true;
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

function injectFrontmatter(content, fields) {
  const endMarker = "\n---";
  const end = content.indexOf(endMarker, 3);
  if (!content.startsWith("---\n") || end === -1) {
    throw new Error("SKILL.md must start with YAML frontmatter.");
  }

  const additions = Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  return `${content.slice(0, end)}\n${additions}${content.slice(end)}`;
}

function skillContentForTarget(targetName) {
  const content = fs.readFileSync(path.join(rootDir, "SKILL.md"), "utf8");
  if (targetName === "claude") {
    return injectFrontmatter(content, {
      "disable-model-invocation": "true",
      "user-invocable": "true"
    });
  }
  return content;
}

function copySkill(dest, force, targetName = "custom") {
  const resolvedDest = path.resolve(dest);
  if (fs.existsSync(resolvedDest)) {
    if (!force) {
      throw new Error(`${resolvedDest} already exists. Re-run with --force to replace it.`);
    }
    fs.rmSync(resolvedDest, { recursive: true, force: true });
  }

  fs.mkdirSync(resolvedDest, { recursive: true });
  for (const entry of skillEntries) {
    const src = path.join(rootDir, entry);
    if (!fs.existsSync(src)) continue;
    const destEntry = path.join(resolvedDest, entry);
    if (entry === "SKILL.md") {
      fs.writeFileSync(destEntry, skillContentForTarget(targetName));
    } else {
      fs.cpSync(src, destEntry, { recursive: true });
    }
  }
  return resolvedDest;
}

function resolveTargetDirs(opts) {
  if (opts.dir) {
    return [["custom", opts.dir]];
  }

  const requested = opts.target === "all"
    ? ["codex", "codex-legacy", "claude", "hermes"]
    : opts.target.split(",").map((item) => item.trim()).filter(Boolean);

  const targets = targetPaths();
  const resolved = requested.map((name) => {
    const targetPath = targets[name];
    if (!targetPath) {
      throw new Error(`Unknown target "${name}". Valid targets: ${Object.keys(targets).join(", ")}, all.`);
    }
    return [name, targetPath];
  });

  const seen = new Set();
  return resolved.filter(([, targetPath]) => {
    const key = path.resolve(targetPath).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function install(opts) {
  const installed = [];
  for (const [name, targetPath] of resolveTargetDirs(opts)) {
    installed.push([name, copySkill(targetPath, opts.force, name)]);
  }

  for (const [name, targetPath] of installed) {
    console.log(`${name}: ${targetPath}`);
  }
  console.log("Installed Task Flow. Invoke it with /taskflow.");
}

function syncLayout() {
  const tapDir = path.join(rootDir, "skills", skillName);
  copySkill(tapDir, true, "hermes");
  console.log(`synced: ${tapDir}`);
}

function printPaths() {
  for (const [name, targetPath] of Object.entries(targetPaths())) {
    console.log(`${name}: ${targetPath}`);
  }
}

try {
  const opts = parseArgs(process.argv);
  if (opts.command === "install") {
    install(opts);
  } else if (opts.command === "sync-layout") {
    syncLayout();
  } else if (opts.command === "paths") {
    printPaths();
  } else {
    usage(opts.command === "help" ? 0 : 1);
  }
} catch (error) {
  console.error(`taskflow-skill: ${error.message}`);
  process.exit(1);
}
