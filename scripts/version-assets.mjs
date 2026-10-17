import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function assetVersion(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex').slice(0, 12);
}

// Pages caches static files. Version resources so a new entry document cannot
// pick up an old script, stylesheet, or QR from a previous rehearsal.
export async function versionAssets(html, directory) {
  for (const [reference, attribute, asset] of html.matchAll(/(src|href)="(\.\/[^"?#]+\.(?:js|css|svg))(?:\?[^"#]*)?"/g)) {
    html = html.replace(reference, `${attribute}="${asset}?v=${await assetVersion(join(directory, asset))}"`);
  }
  return html;
}
