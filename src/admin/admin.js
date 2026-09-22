const OWNER = 'RedneckRuntu';
const REPO = 'RedneckRuntu.github.io';
const BRANCH = 'main';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const PHOTOS_PATH = 'content/data/photos.json';

const state = { token: '', user: '', photos: [], projects: [], categories: [], editingId: null, file: null };
const $ = (selector) => document.querySelector(selector);
const authPanel = $('#auth-panel');
const workspace = $('#workspace');
const photoForm = $('#photo-form');
const editorEmpty = $('#editor-empty');
const authStatus = $('#auth-status');
const publishStatus = $('#publish-status');

async function api(path, options = {}) {
  const response = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${state.token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try { message = (await response.json()).message || message; } catch {}
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}

function decodeBase64(value) {
  const bytes = Uint8Array.from(atob(value.replace(/\n/g, '')), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function fileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function readJson(path) {
  const file = await api(`/contents/${path}?ref=${BRANCH}`);
  return JSON.parse(decodeBase64(file.content));
}

async function loadSiteData() {
  [state.photos, state.projects, state.categories] = await Promise.all([
    readJson(PHOTOS_PATH), readJson('content/data/projects.json'), readJson('content/data/categories.json')
  ]);
  renderProjects();
  renderCategories();
  renderPhotos();
}

function imageUrl(photo) {
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/content/photos/${encodeURIComponent(photo.src)}?v=${Date.now()}`;
}

function renderPhotos() {
  const list = $('#photo-list');
  list.replaceChildren();
  $('#photo-count').textContent = `${state.photos.length} 张`;
  [...state.photos].sort((a, b) => (a.project || '').localeCompare(b.project || '') || a.order - b.order).forEach((photo) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `photo-card${state.editingId === photo.id ? ' active' : ''}`;
    const img = document.createElement('img');
    img.src = imageUrl(photo);
    img.alt = '';
    const copy = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = photo.title || photo.id;
    const meta = document.createElement('small');
    meta.textContent = `${photo.location || '未填写地点'} · ${photo.visible ? '公开' : '已隐藏'}`;
    copy.append(title, meta);
    button.append(img, copy);
    button.addEventListener('click', () => editPhoto(photo.id));
    list.append(button);
  });
}

function renderProjects() {
  const select = $('#project');
  select.replaceChildren();
  state.projects.filter((item) => item.visible !== false).forEach((project) => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.title;
    select.append(option);
  });
}

function renderCategories() {
  const container = $('#category-options');
  container.replaceChildren();
  state.categories.filter((item) => item.visible !== false).sort((a, b) => a.order - b.order).forEach((category) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'category';
    input.value = category.id;
    label.append(input, document.createTextNode(category.title));
    container.append(label);
  });
}

function showEditor() {
  editorEmpty.hidden = true;
  photoForm.hidden = false;
  publishStatus.textContent = '';
  publishStatus.className = 'status';
}

function resetPreview() {
  $('#photo-preview').hidden = true;
  $('#photo-preview').removeAttribute('src');
  $('#drop-copy').hidden = false;
}

function startNewPhoto() {
  state.editingId = null;
  state.file = null;
  photoForm.reset();
  $('#archive').checked = true;
  $('#visible').checked = true;
  const firstProject = state.projects.find((item) => item.visible !== false);
  if (firstProject) $('#project').value = firstProject.id;
  $('#order').value = state.photos.filter((item) => item.project === $('#project').value).length + 1;
  $('#editor-mode').textContent = '新增作品';
  $('#editor-heading').textContent = '上传一张照片';
  $('#publish-button').textContent = '发布到网站';
  resetPreview();
  showEditor();
  renderPhotos();
}

function editPhoto(id) {
  const photo = state.photos.find((item) => item.id === id);
  if (!photo) return;
  state.editingId = id;
  state.file = null;
  photoForm.reset();
  $('#title').value = photo.title || '';
  $('#date').value = photo.date || '';
  $('#location').value = photo.location || '';
  $('#project').value = photo.project || '';
  $('#order').value = photo.order || 1;
  $('#alt').value = photo.alt || '';
  $('#featured').checked = Boolean(photo.featured);
  $('#homepage').checked = Boolean(photo.homepage);
  $('#archive').checked = photo.archive !== false;
  $('#visible').checked = photo.visible !== false;
  document.querySelectorAll('input[name="category"]').forEach((input) => { input.checked = (photo.categories || []).includes(input.value); });
  $('#editor-mode').textContent = '修改作品';
  $('#editor-heading').textContent = photo.title || photo.id;
  $('#publish-button').textContent = '保存修改';
  $('#photo-preview').src = imageUrl(photo);
  $('#photo-preview').hidden = false;
  $('#drop-copy').hidden = true;
  showEditor();
  renderPhotos();
}

function slugify(value) {
  return value.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

async function imageDimensions(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally { URL.revokeObjectURL(url); }
}

async function publishCommit(updatedPhotos, photoFile, photoPath) {
  const ref = await api(`/git/ref/heads/${BRANCH}`);
  const parentSha = ref.object.sha;
  const parentCommit = await api(`/git/commits/${parentSha}`);
  const photosBlob = await api('/git/blobs', {
    method: 'POST', body: JSON.stringify({ content: encodeBase64(`${JSON.stringify(updatedPhotos, null, 2)}\n`), encoding: 'base64' })
  });
  const entries = [{ path: PHOTOS_PATH, mode: '100644', type: 'blob', sha: photosBlob.sha }];
  if (photoFile) {
    const imageBlob = await api('/git/blobs', {
      method: 'POST', body: JSON.stringify({ content: await fileBase64(photoFile), encoding: 'base64' })
    });
    entries.push({ path: photoPath, mode: '100644', type: 'blob', sha: imageBlob.sha });
  }
  const tree = await api('/git/trees', {
    method: 'POST', body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree: entries })
  });
  const commit = await api('/git/commits', {
    method: 'POST', body: JSON.stringify({
      message: state.editingId ? `Update photograph: ${state.editingId}` : `Add photograph: ${updatedPhotos.at(-1).id}`,
      tree: tree.sha, parents: [parentSha]
    })
  });
  await api(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
}

$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.submitter;
  state.token = $('#token').value.trim();
  authStatus.textContent = '正在连接并读取作品…';
  authStatus.className = 'status';
  button.disabled = true;
  try {
    const [user, repo] = await Promise.all([api('https://api.github.com/user'), api('')]);
    if (!repo.permissions?.push) throw new Error('这个令牌没有该仓库的写入权限，请检查 Contents 是否为 Read and write。');
    state.user = user.login;
    await loadSiteData();
    $('#account-name').textContent = `已连接：${user.login}`;
    $('#token').value = '';
    authPanel.hidden = true;
    workspace.hidden = false;
    authStatus.textContent = '';
  } catch (error) {
    state.token = '';
    authStatus.textContent = `连接失败：${error.message}`;
    authStatus.className = 'status error';
  } finally { button.disabled = false; }
});

$('#new-button').addEventListener('click', startNewPhoto);
$('#cancel-button').addEventListener('click', () => {
  state.editingId = null;
  state.file = null;
  photoForm.hidden = true;
  editorEmpty.hidden = false;
  renderPhotos();
});
$('#refresh-button').addEventListener('click', async (event) => {
  event.currentTarget.disabled = true;
  try { await loadSiteData(); } finally { event.currentTarget.disabled = false; }
});
$('#project').addEventListener('change', () => {
  if (!state.editingId) $('#order').value = state.photos.filter((item) => item.project === $('#project').value).length + 1;
});
$('#photo-file').addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (!file) return;
  state.file = file;
  $('#photo-preview').src = URL.createObjectURL(file);
  $('#photo-preview').hidden = false;
  $('#drop-copy').hidden = true;
});

photoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#publish-button');
  const existing = state.photos.find((item) => item.id === state.editingId);
  if (!existing && !state.file) {
    publishStatus.textContent = '请先选择一张照片。';
    publishStatus.className = 'status error';
    return;
  }
  if (state.file && state.file.size > 15 * 1024 * 1024) {
    publishStatus.textContent = '照片超过 15 MB，请先导出较小的 JPG。';
    publishStatus.className = 'status error';
    return;
  }
  button.disabled = true;
  publishStatus.textContent = '正在安全上传并更新网站，请不要关闭页面…';
  publishStatus.className = 'status';
  try {
    let id = existing?.id;
    let src = existing?.src;
    let orientation = existing?.orientation || 'landscape';
    if (state.file) {
      const extension = (state.file.name.match(/\.[a-z0-9]+$/i)?.[0] || '.jpg').toLowerCase();
      if (!id) {
        const base = slugify(state.file.name) || `photo-${Date.now()}`;
        id = base;
        let suffix = 2;
        while (state.photos.some((item) => item.id === id)) id = `${base}-${suffix++}`;
      }
      src = `${id}${extension}`;
      const dimensions = await imageDimensions(state.file);
      orientation = dimensions.width >= dimensions.height ? 'landscape' : 'portrait';
    }
    const project = $('#project').value;
    const categories = [...document.querySelectorAll('input[name="category"]:checked')].map((input) => input.value);
    const next = {
      id, src, title: $('#title').value.trim(), date: $('#date').value.trim(), location: $('#location').value.trim(), project,
      categories, orientation, featured: $('#featured').checked, homepage: $('#homepage').checked,
      homepageOrder: existing?.homepageOrder ?? 999, archive: $('#archive').checked, order: Number($('#order').value || 1),
      caption: existing?.caption || '', alt: $('#alt').value.trim(), visible: $('#visible').checked
    };
    const updated = existing ? state.photos.map((item) => item.id === existing.id ? next : item) : [...state.photos, next];
    await publishCommit(updated, state.file, state.file ? `content/photos/${src}` : null);
    state.photos = updated;
    state.editingId = next.id;
    state.file = null;
    renderPhotos();
    publishStatus.textContent = '提交成功，网站正在自动更新。';
    publishStatus.className = 'status success';
    $('#success-dialog').showModal();
  } catch (error) {
    publishStatus.textContent = `发布失败：${error.message}`;
    publishStatus.className = 'status error';
  } finally { button.disabled = false; }
});

$('#success-close').addEventListener('click', () => $('#success-dialog').close());
