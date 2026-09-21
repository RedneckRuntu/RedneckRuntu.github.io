import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const pages = [];
const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes:true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.name.endsWith('.html')) pages.push(target);
  }
};
await walk(dist);
const errors = [];
for (const page of pages) {
  const html = await readFile(page, 'utf8');
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${page}: missing title`);
  if (!/<link rel="canonical" href="https:\/\/daijinyan\.top\//.test(html)) errors.push(`${page}: missing canonical`);
  for (const match of html.matchAll(/<(?:a|link|script|img)[^>]+(?:href|src)="(\/[^"]+)"/g)) {
    const url = match[1].split('?')[0].split('#')[0];
    let target = path.join(dist, url);
    if (url.endsWith('/')) target = path.join(target, 'index.html');
    try { await access(target); } catch { errors.push(`${page}: broken internal reference ${url}`); }
  }
  for (const match of html.matchAll(/<img\b([^>]*)>/g)) if (!/\balt="[^"]*"/.test(match[1])) errors.push(`${page}: image missing alt`);
}
const cname = (await readFile(path.join(dist, 'CNAME'), 'utf8')).trim();
if (cname !== 'daijinyan.top') errors.push('CNAME must contain daijinyan.top');
if (errors.length) {
  console.error(errors.map((error) => `• ${error}`).join('\n'));
  process.exit(1);
}
console.log(`Build check passed: ${pages.length} HTML files and no broken local references.`);
