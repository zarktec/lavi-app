#!/usr/bin/env node
// Inyecta una lectura en handleTagUrl de la app en desarrollo, sin tags reales.
// Uso: node scripts/inject-tag.mjs <android|ios> "https://<dominio>/t?d=sim_recorded&c=x"
import { execFileSync } from "node:child_process";

const [platform, tagUrl] = process.argv.slice(2);
if (!platform || !tagUrl) {
  console.error('Uso: node scripts/inject-tag.mjs <android|ios> "<url del tag>"');
  process.exit(1);
}
const link = `lavi://t?url=${encodeURIComponent(tagUrl)}`;
if (platform === "android") {
  execFileSync("adb", ["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", link], { stdio: "inherit" });
} else {
  execFileSync("xcrun", ["simctl", "openurl", "booted", link], { stdio: "inherit" });
}
