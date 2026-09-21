import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const dist = path.join(root, 'dist');
const sourcePhotos = path.join(root, 'content/photos');
const imageOutput = path.join(dist, 'images');
const readJson = async (name) => JSON.parse(await readFile(path.join(root, 'content/data', name), 'utf8'));
const site = await readJson('site.json');
const projects = (await readJson('projects.json')).filter((item) => item.visible);
const categories = (await readJson('categories.json')).filter((item) => item.visible).sort((a,b) => a.order - b.order);
const photos = (await readJson('photos.json')).filter((item) => item.visible);
const photoById = new Map(photos.map((photo) => [photo.id, photo]));

const escapeHtml = (value = '') => String(value).replace(/[&<>\"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[character]));
const slugText = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pagePath = (route) => route === '/' ? dist : path.join(dist, route.replace(/^\//, '').replace(/\/$/, ''));

await rm(dist, { recursive: true, force: true });
await mkdir(imageOutput, { recursive: true });

for (const photo of photos) {
  const input = path.join(sourcePhotos, photo.src);
  const metadata = await sharp(input).metadata();
  photo.width = metadata.width;
  photo.height = metadata.height;
  photo.variants = [];
  const widths = [...new Set([640, 1024, 1600].filter((width) => width <= metadata.width).concat(metadata.width))].sort((a,b) => a-b);
  for (const width of widths) {
    const outputName = `${photo.id}-${width}.webp`;
    await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: width >= 1400 ? 88 : 84, smartSubsample: true }).toFile(path.join(imageOutput, outputName));
    photo.variants.push({ width, src: outputName });
  }
}

const image = (photo, { eager = false, lightbox = false } = {}) => {
  const srcset = photo.variants.map((variant) => `/images/${variant.src} ${variant.width}w`).join(', ');
  const largest = photo.variants.at(-1).src;
  const tag = `<img src="/images/${largest}" srcset="${srcset}" sizes="(max-width: 720px) 94vw, 78vw" width="${photo.width}" height="${photo.height}" alt="${escapeHtml(photo.alt)}" decoding="async" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''}>`;
  return lightbox ? `<button class="image-button" type="button" data-lightbox="${escapeHtml(photo.id)}" aria-label="Open ${escapeHtml(photo.title || 'photograph')} in full view">${tag}</button>` : tag;
};

const nav = `<header class="site-header"><a class="identity" href="/" aria-label="Dai Jinyan Photography — Home"><span>DAI JINYAN</span><span>PHOTOGRAPHY</span></a><nav class="site-nav" aria-label="Primary"><a href="/projects/">PROJECTS</a><a href="/photographs/">PHOTOGRAPHS</a><a href="/archive/">ARCHIVE</a><a href="/about/">ABOUT</a></nav></header>`;
const footer = `<footer class="site-footer"><span>© ${new Date().getFullYear()} DAI JINYAN</span><a href="#top">BACK TO TOP ↑</a></footer>`;
const lightbox = `<dialog class="lightbox" aria-label="Photograph viewer"><button class="lightbox-close" type="button" aria-label="Close">CLOSE</button><button class="lightbox-prev" type="button" aria-label="Previous photograph">←</button><figure><img alt=""><figcaption></figcaption></figure><button class="lightbox-next" type="button" aria-label="Next photograph">→</button></dialog>`;
const layout = ({ title, description = site.description, route = '/', body }) => {
  const canonical = new URL(route, `${site.url}/`).href;
  const structured = JSON.stringify({ '@context':'https://schema.org', '@type':'Person', name:'Dai Jinyan', url:site.url, jobTitle:'Photographer' });
  return `<!doctype html><html lang="en" id="top"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f3f1ec"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="stylesheet" href="/styles.css"><script type="application/ld+json">${structured}</script><script defer src="/client.js"></script></head><body><a class="skip-link" href="#content">Skip to photographs</a>${nav}<main id="content">${body}</main>${footer}${lightbox}</body></html>`;
};

const writePage = async (route, html) => {
  const folder = pagePath(route);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, 'index.html'), html);
};

const homeProjects = projects.filter((project) => project.featured).sort((a,b) => a.homepageOrder - b.homepageOrder);
const selected = photos.filter((photo) => photo.homepage).sort((a,b) => a.homepageOrder - b.homepageOrder).slice(0,4);
const hero = photoById.get('old-building-yellow-flowers');
const projectRows = homeProjects.map((project, index) => {
  const cover = photoById.get(project.cover);
  return `<article class="project-row" data-reveal><a class="project-image" href="/projects/${project.slug}/">${image(cover)}</a><div class="project-meta"><span class="project-index">${String(index + 1).padStart(2, '0')} / ${escapeHtml(project.year)}</span><h3><a href="/projects/${project.slug}/">${escapeHtml(project.title)}</a></h3><p>${escapeHtml(project.subtitle)}</p><a class="text-link" href="/projects/${project.slug}/">View project</a></div></article>`;
}).join('');
const selectedGrid = selected.map((photo) => `<figure data-reveal>${image(photo, { lightbox: true })}<figcaption>${escapeHtml(photo.location)} · ${escapeHtml(photo.date)}</figcaption></figure>`).join('');
await writePage('/', layout({ title:site.title, route:'/', body:`<section class="hero"><p class="hero-kicker">Photography / 2026—</p><h1 class="hero-title">DAI <span>JINYAN</span></h1><figure class="hero-image">${image(hero, { eager:true })}<figcaption class="image-note"><span>Nanjing</span><span>2026</span></figcaption></figure></section><section class="section"><div class="section-head"><p class="section-label">Selected Projects</p><h2 class="section-intro">Photographs shaped by place, distance and the changing character of light.</h2></div>${projectRows}</section><section class="section"><div class="section-head"><p class="section-label">Selected Photographs</p><h2 class="section-intro">Independent images, edited as a quiet sequence.</h2></div><div class="selected-grid">${selectedGrid}</div></section>` }));

const projectCards = projects.sort((a,b) => a.homepageOrder - b.homepageOrder).map((project, index) => {
  const cover = photoById.get(project.cover);
  return `<article class="index-project"><a href="/projects/${project.slug}/">${image(cover)}<div class="index-project-copy"><span>${String(index + 1).padStart(2,'0')} · ${escapeHtml(project.year)}</span><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.subtitle)}</p></div></a></article>`;
}).join('');
await writePage('/projects/', layout({ title:`Projects — ${site.name}`, route:'/projects/', body:`<header class="page-intro"><p class="section-label">Projects / Series</p><h1>Long-form work, arranged as photographic essays.</h1></header><section class="project-index">${projectCards}</section>` }));

for (const project of projects) {
  const projectPhotos = photos.filter((photo) => photo.project === project.id).sort((a,b) => a.order - b.order);
  const sequence = projectPhotos.map((photo, index) => `<figure class="sequence-item sequence-${index % 4}" data-reveal>${image(photo, { lightbox:true, eager:index === 0 })}<figcaption><span>${String(index + 1).padStart(2,'0')}</span><span>${escapeHtml(photo.location)} · ${escapeHtml(photo.date)}</span></figcaption></figure>`).join('');
  await writePage(`/projects/${project.slug}/`, layout({ title:`${project.title} — ${site.name}`, description:project.description, route:`/projects/${project.slug}/`, body:`<header class="project-intro"><p class="section-label">Project / ${escapeHtml(project.year)}</p><h1>${escapeHtml(project.title)}</h1><div><p>${escapeHtml(project.description)}</p><dl><dt>Location</dt><dd>${escapeHtml(project.location)}</dd><dt>Works</dt><dd>${projectPhotos.length}</dd><dt>Status</dt><dd>Ongoing</dd></dl></div></header><section class="sequence" aria-label="${escapeHtml(project.title)} photograph sequence">${sequence}</section><nav class="project-end" aria-label="Project navigation"><a href="/projects/">All projects</a><a href="#top">Back to top ↑</a></nav>` }));
}

const photographGrid = photos.filter((photo) => photo.featured).map((photo) => `<figure data-reveal>${image(photo, { lightbox:true })}<figcaption><span>${escapeHtml(photo.title)}</span><span>${escapeHtml(photo.location)} · ${escapeHtml(photo.date)}</span></figcaption></figure>`).join('');
await writePage('/photographs/', layout({ title:`Photographs — ${site.name}`, route:'/photographs/', body:`<header class="page-intro"><p class="section-label">Selected Works</p><h1>Photographs that stand on their own.</h1></header><section class="photograph-grid">${photographGrid}</section>` }));

const archivePhotos = photos.filter((photo) => photo.archive).sort((a,b) => String(b.date).localeCompare(String(a.date)));
const archiveItems = archivePhotos.map((photo) => `<figure data-archive-item data-year="${escapeHtml(String(photo.date).slice(0,4))}" data-location="${escapeHtml(slugText(photo.location))}" data-project="${escapeHtml(photo.project)}" data-categories="${escapeHtml(photo.categories.join(' '))}">${image(photo, { lightbox:true })}<figcaption><span>${escapeHtml(photo.title)}</span><span>${escapeHtml(photo.location)} · ${escapeHtml(photo.date)}</span></figcaption></figure>`).join('');
const categoryFilters = categories.map((category) => `<button type="button" data-filter="${escapeHtml(category.id)}">${escapeHtml(category.title)}</button>`).join('');
const yearFilters = [...new Set(archivePhotos.map((photo) => String(photo.date).slice(0,4)))].filter(Boolean).map((year) => `<button type="button" data-filter="${escapeHtml(year)}">${escapeHtml(year)}</button>`).join('');
const locationFilters = [...new Set(archivePhotos.map((photo) => photo.location))].filter(Boolean).map((location) => `<button type="button" data-filter="${escapeHtml(slugText(location))}">${escapeHtml(location)}</button>`).join('');
const projectFilters = projects.map((project) => `<button type="button" data-filter="${escapeHtml(project.id)}">${escapeHtml(project.title)}</button>`).join('');
await writePage('/archive/', layout({ title:`Archive — ${site.name}`, route:'/archive/', body:`<header class="page-intro archive-intro"><p class="section-label">Archive</p><h1>A growing record of places, years and recurring subjects.</h1></header><div class="archive-toolbar" aria-label="Filter archive"><div><span>View</span><button class="is-active" type="button" data-filter="all">All</button>${yearFilters}${locationFilters}</div><div><span>Series / Subject</span>${projectFilters}${categoryFilters}</div></div><section class="archive-grid" aria-live="polite">${archiveItems}</section><p class="archive-empty" hidden>No photographs match this view.</p>` }));

await writePage('/about/', layout({ title:`About — ${site.name}`, route:'/about/', body:`<section class="about"><p class="section-label">About</p><h1>DAI JINYAN</h1><div class="about-copy"><p>Dai Jinyan is a photographer based in China.</p><p>His current work follows ordinary places, changing weather and the small visual frictions that make a familiar scene feel newly visible. <em>Nanjing × Zhenze</em> is an ongoing project begun in 2026.</p></div><div class="about-meta"><span>China</span><span>Working since 2026</span></div></section>` }));

await writePage('/404/', layout({ title:`Page not found — ${site.name}`, route:'/404/', body:`<section class="not-found"><p>404</p><h1>Page not found.</h1><a class="text-link" href="/">Back to photography</a></section>` }));
await copyFile(path.join(root, 'src/styles.css'), path.join(dist, 'styles.css'));
await copyFile(path.join(root, 'src/client.js'), path.join(dist, 'client.js'));
await copyFile(path.join(root, 'CNAME'), path.join(dist, 'CNAME'));
await writeFile(path.join(dist, '.nojekyll'), '');
await writeFile(path.join(dist, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#151515"/><path d="M17 16h13c12 0 19 6 19 16s-7 16-19 16H17V16Zm12 25c7 0 11-3 11-9s-4-9-11-9h-4v18h4Z" fill="#f3f1ec"/></svg>`);
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
const routes = ['/', '/projects/', ...projects.map((p) => `/projects/${p.slug}/`), '/photographs/', '/archive/', '/about/'];
await writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${new URL(route, `${site.url}/`).href}</loc></url>`).join('')}</urlset>`);
await copyFile(path.join(dist, '404/index.html'), path.join(dist, '404.html'));
console.log(`Built ${photos.length} photographs, ${projects.length} projects and ${routes.length} routes.`);
