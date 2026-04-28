import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '..', 'config.json');

let cache = null;

export function getConfig() {
  if (!cache) {
    cache = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  }
  return cache;
}

export function saveConfig(data) {
  cache = data;
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
}
