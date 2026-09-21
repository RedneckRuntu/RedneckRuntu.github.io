import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const tokens = process.argv.slice(2);
const values = {};
for (let index = 0; index < tokens.length; index += 2) values[tokens[index].replace(/^--/, '')] = tokens[index + 1];
if (!values.id || !values.title || !values.cover) {
  console.error('Usage: npm run new-project -- --id project-id --title "Project title" --cover photo-id --year "2026—" --location "China"');
  process.exit(1);
}
const file = path.join(process.cwd(), 'content/data/projects.json');
const projects = JSON.parse(await readFile(file, 'utf8'));
if (projects.some((project) => project.id === values.id || project.slug === (values.slug || values.id))) throw new Error('Project id or slug already exists.');
projects.push({ id:values.id, slug:values.slug || values.id, title:values.title, subtitle:values.subtitle || '', year:values.year || '', location:values.location || '', description:values.description || '', cover:values.cover, featured:values.featured !== 'false', homepageOrder:Number(values.order || projects.length + 1), visible:values.visible !== 'false' });
await writeFile(file, `${JSON.stringify(projects, null, 2)}\n`);
console.log(`Added project ${values.id}. Run npm run build to validate and generate the site.`);
