import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const readJson = async (name) => JSON.parse(await readFile(path.join(root, 'content/data', name), 'utf8'));
const photos = await readJson('photos.json');
const projects = await readJson('projects.json');
const categories = await readJson('categories.json');
const failures = [];
const unique = (items, key, label) => {
  const seen = new Set();
  items.forEach((item) => seen.has(item[key]) ? failures.push(`Duplicate ${label}: ${item[key]}`) : seen.add(item[key]));
};
unique(photos, 'id', 'photo id');
unique(projects, 'id', 'project id');
unique(projects, 'slug', 'project slug');
unique(categories, 'id', 'category id');
const projectIds = new Set(projects.map((item) => item.id));
const categoryIds = new Set(categories.map((item) => item.id));
const photoIds = new Set(photos.map((item) => item.id));
for (const photo of photos) {
  if (!photo.id || !photo.src || !photo.alt) failures.push(`Photo ${photo.id || '(unknown)'} needs id, src and alt.`);
  if (photo.project && !projectIds.has(photo.project)) failures.push(`Photo ${photo.id} uses missing project ${photo.project}.`);
  for (const category of photo.categories || []) if (!categoryIds.has(category)) failures.push(`Photo ${photo.id} uses missing category ${category}.`);
  try { await access(path.join(root, 'content/photos', photo.src)); } catch { failures.push(`Missing image file for ${photo.id}: ${photo.src}`); }
}
for (const project of projects) if (!photoIds.has(project.cover)) failures.push(`Project ${project.id} uses missing cover ${project.cover}.`);
if (failures.length) {
  console.error(failures.map((failure) => `• ${failure}`).join('\n'));
  process.exit(1);
}
console.log(`Content valid: ${photos.length} photographs, ${projects.length} projects, ${categories.length} categories.`);
