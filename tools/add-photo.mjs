import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [input, ...tokens] = process.argv.slice(2);
const values = {};
for (let index = 0; index < tokens.length; index += 2) values[tokens[index].replace(/^--/, '')] = tokens[index + 1];
if (!input || !values.id || !values.project || !values.alt) {
  console.error('Usage: npm run add-photo -- photo.jpg --id unique-id --project project-id --categories street,night --date 2026-09 --location Nanjing --alt "Description"');
  process.exit(1);
}
const root = process.cwd();
const photosPath = path.join(root, 'content/data/photos.json');
const photos = JSON.parse(await readFile(photosPath, 'utf8'));
if (photos.some((photo) => photo.id === values.id)) throw new Error(`Photo id already exists: ${values.id}`);
const metadata = await sharp(input).metadata();
const extension = path.extname(input).toLowerCase() || '.jpg';
const filename = `${values.id}${extension}`;
await copyFile(input, path.join(root, 'content/photos', filename));
const siblings = photos.filter((photo) => photo.project === values.project);
photos.push({
  id: values.id, src: filename, title: values.title || '', date: values.date || '', location: values.location || '', project: values.project,
  categories: (values.categories || '').split(',').map((item) => item.trim()).filter(Boolean),
  orientation: metadata.width >= metadata.height ? 'landscape' : 'portrait', featured: values.featured === 'true', homepage: values.homepage === 'true',
  homepageOrder: Number(values.homepageOrder || 999), archive: values.archive !== 'false', order: Number(values.order || siblings.length + 1),
  caption: values.caption || '', alt: values.alt, visible: values.visible !== 'false'
});
await writeFile(photosPath, `${JSON.stringify(photos, null, 2)}\n`);
console.log(`Added ${values.id}. Run npm run build to validate and generate the site.`);
