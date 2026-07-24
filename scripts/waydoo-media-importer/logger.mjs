import { appendFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";

import { CONFIG } from "./config.mjs";

export class Logger {
  constructor(logPath = CONFIG.paths.logFile) {
    this.logPath = logPath;
    this.entries = [];
    this.stats = {
      productsProcessed: 0,
      imagesDownloaded: 0,
      imagesSkipped: 0,
      productsUpdated: 0,
      errors: 0,
      pagesFailed: [],
    };
    mkdirSync(dirname(logPath), { recursive: true });
  }

  info(message, meta = {}) {
    this.#write("info", message, meta);
  }

  warn(message, meta = {}) {
    this.#write("warn", message, meta);
  }

  error(message, meta = {}) {
    this.stats.errors += 1;
    this.#write("error", message, meta);
  }

  pageFailed(url, reason) {
    this.stats.pagesFailed.push({ url, reason, at: new Date().toISOString() });
    this.error(`Failed page: ${url}`, { reason });
  }

  progress(label, current, total) {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    process.stdout.write(`\r${label} ${current}/${total} (${pct}%)`);
    if (current >= total) process.stdout.write("\n");
  }

  flush() {
    writeFileSync(this.logPath, JSON.stringify({ stats: this.stats, entries: this.entries }, null, 2));
  }

  printSummary() {
    const { stats } = this;
    console.log("\n=== Waydoo Media Import Summary ===");
    console.log(`Products processed:     ${stats.productsProcessed}`);
    console.log(`Images downloaded:      ${stats.imagesDownloaded}`);
    console.log(`Images skipped:         ${stats.imagesSkipped}`);
    console.log(`Products updated:       ${stats.productsUpdated}`);
    console.log(`Errors encountered:     ${stats.errors}`);
    if (stats.pagesFailed.length) {
      console.log(`Pages failed:           ${stats.pagesFailed.length}`);
      for (const page of stats.pagesFailed.slice(0, 10)) {
        console.log(`  - ${page.url}: ${page.reason}`);
      }
      if (stats.pagesFailed.length > 10) {
        console.log(`  ... and ${stats.pagesFailed.length - 10} more (see ${this.logPath})`);
      }
    }
    console.log(`Log written to:         ${this.logPath}`);
  }

  #write(level, message, meta) {
    const entry = { level, message, meta, at: new Date().toISOString() };
    this.entries.push(entry);
    const suffix = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    const line = `[${level.toUpperCase()}] ${message}${suffix}\n`;
    appendFileSync(this.logPath.replace(".json", ".txt"), line);
  }
}
