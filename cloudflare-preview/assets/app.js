/* ==========================================================================
   海关研究资料库 · 前端逻辑
   ========================================================================== */

'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  me: null,
  config: {},
  storage: { files: 0, bytes: 0 },
  view: 'files',
  folder: '',
  query: '',
  page: 1,
  pageSize: 50,
  total: 0,
  files: [],
  sidebarFolders: [],
  subfolders: [],
  breadcrumb: [],
  selected: new Set(),
  members: [],
  uploadQueue: [],
  uploadActive: 0,
  moveIds: [],
  renameFile: null,
  confirmResolve: null,
  loading: false,
};

const ROLE_LABEL = { admin: '管理员', member: '成员', viewer: '只读' };
const ACTION_LABEL = {
  upload: '上传',
  delete: '删除',
  restore: '恢复',
  purge: '彻底删除',
  move: '移动',
  update: '修改',
  zip: '打包下载',
  folder_create: '新建文件夹',
  folder_delete: '删除文件夹',
  member_add: '添加成员',
  member_update: '修改成员',
  member_remove: '移除成员',
  join: '加入',
};

/* --------------------------------------------------------------------------
   小工具
   -------------------------------------------------------------------------- */

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style') node.style.cssText = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }
  for (const child of children.flat(3)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function iconEl(name, cls = 'icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', cls);
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function fmtSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return `今天 ${hm}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return `昨天 ${hm}`;
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function extOf(name) {
  const parts = String(name || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

const BADGE_GROUPS = {
  pdf: ['pdf', 'PDF'],
  doc: ['doc', 'DOC'],
  docx: ['docx', 'DOC'],
  xls: ['xls', 'XLS'],
  xlsx: ['xlsx', 'XLS'],
  csv: ['csv', 'CSV'],
  ppt: ['ppt', 'PPT'],
  pptx: ['pptx', 'PPT'],
  jpg: ['img', 'IMG'],
  jpeg: ['img', 'IMG'],
  png: ['img', 'IMG'],
  gif: ['img', 'IMG'],
  webp: ['img', 'IMG'],
  bmp: ['img', 'IMG'],
  svg: ['img', 'SVG'],
  zip: ['zip', 'ZIP'],
  rar: ['zip', 'RAR'],
  '7z': ['zip', '7Z'],
  txt: ['txt', 'TXT'],
  md: ['txt', 'MD'],
  json: ['txt', 'JSON'],
  mp3: ['txt', 'MP3'],
  wav: ['txt', 'WAV'],
  mp4: ['txt', 'MP4'],
  mov: ['txt', 'MOV'],
};

function badgeFor(name) {
  const ext = extOf(name);
  const [cls, label] = BADGE_GROUPS[ext] || ['file', ext ? ext.slice(0, 4).toUpperCase() : 'FILE'];
  return { cls, label };
}

const PREVIEW_EXTS = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif',
  'txt', 'md', 'csv', 'json', 'mp3', 'wav', 'mp4', 'webm',
]);
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif']);
const TEXT_EXTS = new Set(['txt', 'md', 'csv', 'json']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov']);

function canPreview(file) {
  return PREVIEW_EXTS.has(extOf(file.name));
}

function toast(message, type = 'ok') {
  const wrap = $('#toast-wrap');
  const node = el(
    'div',
    { class: `toast ${type === 'error' ? 'error' : ''}` },
    iconEl(type === 'error' ? 'alert' : 'check'),
    el('span', { text: message })
  );
  wrap.append(node);
  setTimeout(() => {
    node.classList.add('leaving');
    setTimeout(() => node.remove(), 220);
  }, type === 'error' ? 5200 : 3200);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) },
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const err = new Error((data && data.error) || `请求失败（${res.status}）`);
    err.status = res.status;
    err.code = data && data.code;
    throw err;
  }
  return data;
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  const focusable = modal.querySelector('input, select, button');
  if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 40);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.hidden = true;
  if (id === 'confirm-modal' && state.confirmResolve) {
    state.confirmResolve(false);
    state.confirmResolve = null;
  }
  if (id === 'preview-modal') $('#preview-body').replaceChildren();
  if (id === 'upload-modal') {
    const active = state.uploadQueue.some((u) => u.status === 'uploading' || u.status === 'queued');
    if (!active) resetUploadQueue();
  }
  if (!$('.modal-backdrop:not([hidden])')) document.body.style.overflow = '';
}

function confirmDialog({ title, text, okText = '确认', danger = true }) {
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  const ok = $('#confirm-ok');
  ok.textContent = okText;
  ok.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
  openModal('confirm-modal');
  return new Promise((resolve) => {
    state.confirmResolve = resolve;
  });
}

function setBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.dataset.original = button.innerHTML;
    button.disabled = true;
    button.textContent = label || '处理中…';
  } else {
    button.disabled = false;
    if (button.dataset.original != null) {
      button.innerHTML = button.dataset.original;
      delete button.dataset.original;
    }
  }
}

/* --------------------------------------------------------------------------
   启动与门禁
   -------------------------------------------------------------------------- */

async function boot() {
  try {
    const data = await api('/api/me');
    state.me = data.user;
    state.config = data.config || {};
    state.storage = data.storage || { files: 0, bytes: 0 };
    if (data.pending) {
      showPending(data);
      return;
    }
    showApp();
    renderUser();
    renderStorage();
    $('#upload-limit').textContent =
      `单文件最大 ${state.config.maxUploadMB || 95} MB，可一次选择多个`;
    await Promise.all([loadFolders(), loadFiles()]);
  } catch (err) {
    showGateForError(err);
  }
}

function showApp() {
  $('#boot').hidden = true;
  $('#gate').hidden = true;
  $('#app').hidden = false;
  if (state.me.role === 'admin') {
    $$('.admin-only').forEach((n) => (n.hidden = false));
    $('#admin-sep').hidden = false;
  }
  $('#upload-btn').hidden = !(state.me.role === 'admin' || state.me.role === 'member');
}

function showPending(data) {
  $('#boot').hidden = true;
  $('#app').hidden = true;
  const gate = $('#gate');
  gate.hidden = false;
  $('#gate-icon').className = 'gate-icon warn';
  $('#gate-icon').replaceChildren(iconEl('lock'));
  $('#gate-title').textContent = '正在等待管理员批准';
  $('#gate-msg').textContent = `已识别你的账号 ${data.user.email}。管理员通过后即可上传和下载资料。`;
  const extra = $('#gate-extra');
  extra.replaceChildren(
    el('p', { text: '如果长时间没有通过，把邮箱发给课题组管理员，请其在「成员管理」中添加。' }),
    el('button', {
      class: 'btn btn-outline btn-sm',
      type: 'button',
      text: '重新检查',
      onclick: () => location.reload(),
    })
  );
}

function showGateForError(err) {
  $('#boot').hidden = true;
  $('#app').hidden = true;
  const gate = $('#gate');
  gate.hidden = false;
  const icon = $('#gate-icon');
  const title = $('#gate-title');
  const msg = $('#gate-msg');
  const extra = $('#gate-extra');
  extra.replaceChildren();

  if (err.code === 'ACCESS_NOT_CONFIGURED') {
    icon.className = 'gate-icon warn';
    icon.replaceChildren(iconEl('alert'));
    title.textContent = '还差一步：接入 Cloudflare Access';
    msg.textContent = '网站已经部署，但还没有开启登录保护。按下面三步配置后刷新即可。';
    extra.innerHTML = `
      <ol>
        <li>Cloudflare 控制台 → Zero Trust → Access → Applications，新建一个 Self-hosted 应用，域名填本站。</li>
        <li>把应用的 <b>Audience Tag（AUD）</b> 和 Zero Trust 的团队域名填入 Pages 的环境变量：
          <code>ACCESS_AUD</code>、<code>ACCESS_TEAM_DOMAIN</code>。</li>
        <li>在 Pages 重新部署一次，刷新本页。</li>
      </ol>
      <p>详细图文步骤见项目里的 <b>README.md</b> 第 3 节。</p>`;
    return;
  }
  if (err.code === 'NO_DB' || err.code === 'NO_R2') {
    icon.className = 'gate-icon warn';
    icon.replaceChildren(iconEl('alert'));
    title.textContent = '还缺少存储绑定';
    msg.textContent = err.message;
    extra.innerHTML =
      '<p>到 Pages 项目 → Settings → Bindings 添加绑定：D1 变量名 <code>DB</code>，R2 变量名 <code>FILES</code>，然后重新部署。</p>';
    return;
  }
  if (err.status === 401) {
    icon.className = 'gate-icon';
    icon.replaceChildren(iconEl('lock'));
    title.textContent = '请先登录';
    msg.textContent = err.message || '需要通过 Cloudflare Access 验证后才能访问。';
    extra.append(
      el('button', {
        class: 'btn btn-primary btn-sm',
        type: 'button',
        text: '重新加载',
        onclick: () => location.reload(),
      })
    );
    return;
  }
  icon.className = 'gate-icon warn';
  icon.replaceChildren(iconEl('alert'));
  title.textContent = '资料库暂时无法连接';
  msg.textContent = err.message || '请稍后重试。';
  extra.append(
    el('p', { text: '如果刚部署完，等 1–2 分钟再刷新；仍然失败请到 Cloudflare Pages 的 Functions 日志查看原因。' }),
    el('button', {
      class: 'btn btn-outline btn-sm',
      type: 'button',
      text: '重试',
      onclick: () => location.reload(),
    })
  );
}

/* --------------------------------------------------------------------------
   用户 / 存储
   -------------------------------------------------------------------------- */

function renderUser() {
  const u = state.me;
  const initial = (u.name || u.email || '?').trim().charAt(0).toUpperCase();
  $('#user-avatar').textContent = initial;
  $('#user-name').textContent = u.name || u.email.split('@')[0];
  $('#user-email').textContent = u.email;
  $('#user-role').textContent = ROLE_LABEL[u.role] || u.role;
}

function renderStorage() {
  const bytes = Number(state.storage.bytes) || 0;
  $('#storage-text').textContent = `已用 ${fmtSize(bytes)}`;
  const pct = Math.min(100, (bytes / (10 * 1024 * 1024 * 1024)) * 100);
  $('#storage-fill').style.width = `${Math.max(pct, bytes > 0 ? 1.5 : 0)}%`;
  $('#storage-note').textContent =
    bytes > 10 * 1024 * 1024 * 1024
      ? '已超出 R2 免费额度，按量计费'
      : 'R2 免费额度 10 GB';
}

/* --------------------------------------------------------------------------
   文件夹
   -------------------------------------------------------------------------- */

async function loadFolders() {
  try {
    const data = await api('/api/folders');
    state.sidebarFolders = data.folders || [];
    renderSidebarFolders();
    renderFolderOptions();
  } catch (err) {
    if (err.status === 401) showGateForError(err);
  }
}

function renderSidebarFolders() {
  const wrap = $('#folder-list');
  wrap.replaceChildren();
  wrap.append(
    el(
      'button',
      {
        class: `folder-item root ${state.view === 'files' && !state.folder ? 'active' : ''}`,
        type: 'button',
        onclick: () => goFolder(''),
      },
      iconEl('home'),
      el('span', { class: 'fname', text: '全部文件' }),
      el('span', { class: 'fcount', text: String(state.storage.files || '') })
    )
  );

  for (const folder of state.sidebarFolders) {
    if (!folder.path) continue;
    const btn = el(
      'button',
      {
        class: `folder-item ${state.view === 'files' && state.folder === folder.path ? 'active' : ''}`,
        type: 'button',
        title: folder.path,
        style: `padding-left:${10 + Math.min(folder.depth, 8) * 13}px`,
        onclick: () => goFolder(folder.path),
      },
      iconEl('folder'),
      el('span', { class: 'fname', text: folder.name }),
      folder.count ? el('span', { class: 'fcount', text: String(folder.count) }) : null
    );
    wrap.append(btn);
  }

  if (!state.sidebarFolders.some((f) => f.path)) {
    wrap.append(el('div', { class: 'folder-empty-hint', text: '还没有文件夹' }));
  }
}

function renderFolderOptions() {
  const list = $('#folder-options');
  list.replaceChildren();
  for (const folder of state.sidebarFolders) {
    if (!folder.path) continue;
    list.append(el('option', { value: folder.path }));
  }
}

function goFolder(path) {
  state.view = 'files';
  state.folder = path;
  state.query = '';
  state.page = 1;
  state.selected.clear();
  $('#search-input').value = '';
  $('#search-clear').hidden = true;
  updateNav();
  updateViewChrome();
  closeSidebar();
  loadFiles();
}

/* --------------------------------------------------------------------------
   列表
   -------------------------------------------------------------------------- */

let filesLoadSeq = 0;

async function loadFiles() {
  const seq = ++filesLoadSeq;
  state.loading = true;
  const params = new URLSearchParams();
  params.set('view', state.view === 'trash' ? 'trash' : state.view === 'mine' ? 'mine' : 'files');
  params.set('page', String(state.page));
  params.set('pageSize', String(state.pageSize));
  if (state.query) params.set('q', state.query);
  else if (state.folder) params.set('folder', state.folder);

  try {
    const data = await api(`/api/files?${params}`);
    if (seq !== filesLoadSeq) return;
    state.files = data.files || [];
    state.subfolders = data.folders || [];
    state.breadcrumb = data.breadcrumb || [];
    state.total = data.total || 0;
    state.storage = data.storage || state.storage;
    if (data.folder !== undefined && !state.query) state.folder = data.folder;
    state.selected.clear();
    renderFilesPage(data);
    renderStorage();
    renderSidebarFolders();
  } catch (err) {
    if (seq !== filesLoadSeq) return;
    if (err.status === 401) showGateForError(err);
    else toast(err.message, 'error');
  } finally {
    if (seq === filesLoadSeq) state.loading = false;
  }
}

function renderFilesPage(data) {
  const isSearch = !!state.query;
  const isTrash = state.view === 'trash';
  const isMine = state.view === 'mine';

  $('#breadcrumb').replaceChildren();
  const crumbs = isSearch
    ? [{ name: '搜索结果', path: '' }]
    : isTrash
      ? [{ name: '回收站', path: '' }]
      : isMine
        ? [{ name: '我的上传', path: '' }]
        : data.breadcrumb || [];
  crumbs.forEach((crumb, i) => {
    if (i > 0) $('#breadcrumb').append(el('span', { class: 'sep', text: '/' }));
    if (i === crumbs.length - 1) {
      $('#breadcrumb').append(el('span', { class: 'current', text: crumb.name }));
    } else {
      $('#breadcrumb').append(
        el('button', {
          type: 'button',
          text: crumb.name,
          onclick: () => goFolder(crumb.path),
        })
      );
    }
  });

  const last = crumbs[crumbs.length - 1];
  $('#page-title').textContent = last ? last.name : '全部文件';
  const totalSize = state.files.reduce((n, f) => n + (Number(f.size) || 0), 0);
  $('#page-sub').textContent = isSearch
    ? `找到 ${state.total} 个匹配「${state.query}」的文件`
    : `${state.total} 个文件 · 当前页 ${fmtSize(totalSize)}`;

  renderFolderCards(data.folders || []);
  renderTable();
  renderPagination();

  const empty = state.files.length === 0;
  $('#empty-state').hidden = !empty;
  $('.table-wrap').hidden = empty;
  if (empty) {
    const title = $('#empty-title');
    const text = $('#empty-text');
    const btn = $('#empty-upload');
    if (isSearch) {
      title.textContent = '没有找到匹配的资料';
      text.textContent = '换个关键词试试，或者清空搜索回到文件夹浏览。';
      btn.hidden = true;
    } else if (isTrash) {
      title.textContent = '回收站是空的';
      text.textContent = '删除的文件会先放到这里，管理员可以彻底清理。';
      btn.hidden = true;
    } else if (isMine) {
      title.textContent = '你还没有上传过资料';
      text.textContent = '把文件拖到页面上，或点击右上角「上传资料」。';
      btn.hidden = false;
    } else {
      title.textContent = '这里还没有资料';
      text.textContent = state.folder
        ? '这个文件夹还是空的，上传几份资料吧。'
        : '把文件拖到页面上，或点击右上角「上传资料」。';
      btn.hidden = false;
    }
  }
}

function renderFolderCards(folders) {
  const section = $('#folders-section');
  const grid = $('#folder-grid');
  grid.replaceChildren();
  if (!folders.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  for (const folder of folders) {
    const card = el(
      'button',
      {
        class: 'folder-card',
        type: 'button',
        onclick: () => goFolder(folder.path),
      },
      el('span', { class: 'folder-card-icon' }, iconEl('folder')),
      el(
        'span',
        { class: 'folder-card-meta' },
        el('strong', { text: folder.name }),
        el('span', { text: `${folder.count || 0} 个文件` })
      ),
      iconEl('chevron', 'icon icon-chevron')
    );
    grid.append(card);
  }
}

function renderTable() {
  const tbody = $('#file-tbody');
  tbody.replaceChildren();
  const isTrash = state.view === 'trash';

  for (const file of state.files) {
    const tr = el('tr', { dataset: { id: file.id } });
    if (state.selected.has(file.id)) tr.classList.add('selected');

    const check = el('input', { type: 'checkbox', 'aria-label': `选择 ${file.name}` });
    check.checked = state.selected.has(file.id);
    check.addEventListener('change', () => toggleSelect(file.id, check.checked));
    tr.append(el('td', { class: 'col-check' }, check));

    const badge = badgeFor(file.name);
    const link = el('button', {
      class: 'file-link',
      type: 'button',
      text: file.name,
      title: file.name,
      disabled: isTrash,
      onclick: () => (isTrash ? null : openPreview(file)),
    });
    const sub = el('div', { class: 'file-sub' });
    if (isTrash) {
      sub.append(el('span', { class: 'deleted-mark', text: '已删除' }));
      if (file.deleted_at) sub.append(el('span', { text: fmtTime(file.deleted_at) }));
    } else if (file.folder) {
      sub.append(el('span', { class: 'tag', text: file.folder }));
    }
    const nameCell = el(
      'div',
      { class: 'file-name-cell' },
      el('span', { class: `file-badge ${badge.cls}`, text: badge.label }),
      el('div', { class: 'file-text' }, link, sub)
    );
    tr.append(el('td', { class: 'col-name' }, nameCell));

    tr.append(el('td', { class: 'col-size cell-muted', text: fmtSize(file.size) }));

    const userInitial = (file.uploaded_by || '?').charAt(0).toUpperCase();
    tr.append(
      el(
        'td',
        { class: 'col-user hide-md' },
        el(
          'div',
          { class: 'user-chip' },
          el('span', { class: 'mini-avatar', text: userInitial }),
          el('span', { text: (file.uploaded_by || '').split('@')[0] })
        )
      )
    );

    tr.append(el('td', { class: 'col-time hide-sm cell-muted', text: fmtTime(file.uploaded_at) }));

    const actions = el('div', { class: 'row-actions' });
    if (!isTrash) {
      if (canPreview(file)) {
        actions.append(iconBtn('eye', '预览', () => openPreview(file)));
      }
      actions.append(downloadLink(file));
      if (file.can_edit) {
        actions.append(iconBtn('edit', '重命名', () => openRename(file)));
        actions.append(iconBtn('trash', '删除', () => deleteOne(file), 'danger'));
      }
    } else {
      if (file.can_edit) {
        actions.append(iconBtn('restore', '恢复', () => restoreOne(file)));
      }
      if (file.can_purge) {
        actions.append(iconBtn('trash', '彻底删除', () => purgeOne(file), 'danger'));
      }
    }
    tr.append(el('td', { class: 'col-actions' }, actions));
    tbody.append(tr);
  }

  const allChecked =
    state.files.length > 0 && state.files.every((f) => state.selected.has(f.id));
  const selectAll = $('#select-all');
  selectAll.checked = allChecked;
  selectAll.indeterminate = !allChecked && state.selected.size > 0;
  updateBatchBar();
}

function iconBtn(icon, title, onClick, extra = '') {
  return el(
    'button',
    {
      class: `icon-btn ${extra}`,
      type: 'button',
      title,
      'aria-label': title,
      onclick: onClick,
    },
    iconEl(icon)
  );
}

function downloadLink(file) {
  const a = el(
    'a',
    {
      class: 'icon-btn',
      href: `/api/download/${file.id}`,
      title: '下载',
      'aria-label': `下载 ${file.name}`,
    },
    iconEl('download')
  );
  return a;
}

function renderPagination() {
  const pages = Math.max(1, Math.ceil(state.total / state.pageSize));
  const wrap = $('#pagination');
  wrap.hidden = pages <= 1;
  $('#page-info').textContent = `第 ${state.page} / ${pages} 页`;
  $('#page-prev').disabled = state.page <= 1;
  $('#page-next').disabled = state.page >= pages;
}

/* --------------------------------------------------------------------------
   选择与批量
   -------------------------------------------------------------------------- */

function toggleSelect(id, checked) {
  if (checked) state.selected.add(id);
  else state.selected.delete(id);
  const row = $(`#file-tbody tr[data-id="${id}"]`);
  if (row) row.classList.toggle('selected', checked);
  const selectAll = $('#select-all');
  const allChecked =
    state.files.length > 0 && state.files.every((f) => state.selected.has(f.id));
  selectAll.checked = allChecked;
  selectAll.indeterminate = !allChecked && state.selected.size > 0;
  updateBatchBar();
}

function clearSelection() {
  state.selected.clear();
  $$('#file-tbody tr').forEach((tr) => tr.classList.remove('selected'));
  $$('#file-tbody input[type="checkbox"]').forEach((c) => (c.checked = false));
  $('#select-all').checked = false;
  $('#select-all').indeterminate = false;
  updateBatchBar();
}

function updateBatchBar() {
  const n = state.selected.size;
  $('#batch-bar').hidden = n === 0;
  $('#batch-count').textContent = String(n);
  const isTrash = state.view === 'trash';
  $('#batch-download').hidden = isTrash;
  $('#batch-move').hidden = isTrash;
  $('#batch-delete').hidden = isTrash;
  $('#batch-restore').hidden = !isTrash;
  $('#batch-purge').hidden = !isTrash || state.me.role !== 'admin';
  $('#selection-hint').textContent = n ? '' : '勾选文件可批量操作';
}

async function batchDownload() {
  const ids = [...state.selected];
  if (!ids.length) return;
  toast(`正在打包 ${ids.length} 个文件…`);
  const a = document.createElement('a');
  a.href = `/api/zip?ids=${encodeURIComponent(ids.join(','))}`;
  a.download = '';
  document.body.append(a);
  a.click();
  a.remove();
}

function openMove(ids) {
  state.moveIds = ids;
  const target = state.folder || '';
  $('#move-folder').value = target;
  openModal('move-modal');
}

async function confirmMove() {
  const folder = $('#move-folder').value.trim();
  const btn = $('#move-confirm');
  setBusy(btn, true);
  try {
    await api('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move', ids: state.moveIds, folder }),
    });
    closeModal('move-modal');
    state.selected.clear();
    toast(`已移动 ${state.moveIds.length} 个文件`);
    await Promise.all([loadFolders(), loadFiles()]);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}

async function batchDelete() {
  const ids = [...state.selected];
  if (!ids.length) return;
  const ok = await confirmDialog({
    title: '移入回收站',
    text: `确定的 ${ids.length} 个文件将移入回收站，管理员之后可以恢复或彻底删除。`,
    okText: '移入回收站',
  });
  if (!ok) return;
  try {
    await api('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ids }),
    });
    toast(`已移入回收站：${ids.length} 个文件`);
    state.selected.clear();
    await Promise.all([loadFolders(), loadFiles()]);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function batchRestore() {
  const ids = [...state.selected];
  if (!ids.length) return;
  try {
    await api('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore', ids }),
    });
    toast(`已恢复 ${ids.length} 个文件`);
    state.selected.clear();
    await Promise.all([loadFolders(), loadFiles()]);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function batchPurge() {
  const ids = [...state.selected];
  if (!ids.length) return;
  const ok = await confirmDialog({
    title: '彻底删除',
    text: `将永久删除 ${ids.length} 个文件及其存储内容，无法恢复。确定继续吗？`,
    okText: '永久删除',
  });
  if (!ok) return;
  try {
    await api('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'purge', ids }),
    });
    toast(`已彻底删除 ${ids.length} 个文件`);
    state.selected.clear();
    await loadFiles();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function deleteOne(file) {
  const ok = await confirmDialog({
    title: '移入回收站',
    text: `「${file.name}」将移入回收站，之后可以恢复。`,
    okText: '移入回收站',
  });
  if (!ok) return;
  try {
    await api('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ids: [file.id] }),
    });
    toast('已移入回收站');
    await Promise.all([loadFolders(), loadFiles()]);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function restoreOne(file) {
  try {
    await api('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore', ids: [file.id] }),
    });
    toast('已恢复');
    await Promise.all([loadFolders(), loadFiles()]);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function purgeOne(file) {
  const ok = await confirmDialog({
    title: '彻底删除',
    text: `「${file.name}」将被永久删除，无法恢复。`,
    okText: '永久删除',
  });
  if (!ok) return;
  try {
    await api('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'purge', ids: [file.id] }),
    });
    toast('已彻底删除');
    await loadFiles();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* --------------------------------------------------------------------------
   上传
   -------------------------------------------------------------------------- */

function resetUploadQueue() {
  state.uploadQueue = [];
  $('#upload-queue').replaceChildren();
  $('#upload-summary').textContent = '';
}

function openUpload() {
  if (!(state.me.role === 'admin' || state.me.role === 'member')) {
    toast('当前账号只有下载权限', 'error');
    return;
  }
  const active = state.uploadQueue.some((u) => u.status === 'uploading' || u.status === 'queued');
  if (!active && state.uploadQueue.length) resetUploadQueue();
  $('#upload-folder-label').textContent = state.folder || '全部文件';
  openModal('upload-modal');
}

function addFiles(fileList) {
  const maxMB = Number(state.config.maxUploadMB) || 95;
  const maxBytes = maxMB * 1024 * 1024;
  let skipped = 0;
  for (const file of [...fileList]) {
    if (file.size > maxBytes) {
      skipped++;
      toast(`「${file.name}」超过 ${maxMB} MB，已跳过`, 'error');
      continue;
    }
    state.uploadQueue.push({
      id: `u${Date.now()}${Math.random().toString(16).slice(2, 8)}`,
      file,
      folder: state.folder || '',
      status: 'queued',
      progress: 0,
      error: '',
      finished: false,
    });
  }
  if (!skipped && fileList.length === 0) return;
  renderUploadQueue();
  pumpUploads();
}

function pumpUploads() {
  while (state.uploadActive < 2) {
    const item = state.uploadQueue.find((u) => u.status === 'queued');
    if (!item) break;
    startUpload(item);
  }
  updateUploadSummary();
}

function finishUpload(item) {
  if (item.finished) return false;
  item.finished = true;
  state.uploadActive = Math.max(0, state.uploadActive - 1);
  return true;
}

function startUpload(item) {
  item.status = 'uploading';
  state.uploadActive++;
  renderUploadQueue();

  const xhr = new XMLHttpRequest();
  item.xhr = xhr;
  const params = new URLSearchParams({
    name: item.file.name,
    folder: item.folder || '',
    type: item.file.type || '',
  });
  xhr.open('POST', `/api/upload?${params.toString()}`);
  xhr.setRequestHeader('Content-Type', item.file.type || 'application/octet-stream');
  xhr.upload.addEventListener('progress', (event) => {
    if (!event.lengthComputable) return;
    item.progress = event.loaded / event.total;
    const bar = $(`#up-bar-${item.id}`);
    if (bar) bar.style.width = `${Math.max(2, item.progress * 100)}%`;
    const status = $(`#up-status-${item.id}`);
    if (status) status.textContent = `上传中 ${Math.round(item.progress * 100)}%`;
  });
  xhr.addEventListener('load', () => {
    if (!finishUpload(item)) return;
    let data = null;
    try {
      data = JSON.parse(xhr.responseText);
    } catch {
      /* ignore */
    }
    if (xhr.status >= 200 && xhr.status < 300 && data && data.ok && data.file) {
      item.status = 'done';
      item.progress = 1;
      state.storage.bytes += Number(data.file.size) || 0;
      state.storage.files += 1;
      renderStorage();
    } else if (xhr.status >= 200 && xhr.status < 300) {
      item.status = 'error';
      item.error = '登录状态可能已过期，请刷新页面后重试';
    } else {
      item.status = 'error';
      item.error = (data && data.error) || `上传失败（${xhr.status}）`;
    }
    renderUploadQueue();
    pumpUploads();
    maybeRefreshAfterUpload();
  });
  xhr.addEventListener('error', () => {
    if (!finishUpload(item)) return;
    item.status = 'error';
    item.error = '网络中断，请重试';
    renderUploadQueue();
    pumpUploads();
    maybeRefreshAfterUpload();
  });
  xhr.addEventListener('abort', () => {
    if (!finishUpload(item)) return;
    item.status = 'error';
    item.error = '已取消';
    renderUploadQueue();
    pumpUploads();
    maybeRefreshAfterUpload();
  });
  xhr.send(item.file);
}

function maybeRefreshAfterUpload() {
  const busy = state.uploadQueue.some((u) => u.status === 'uploading' || u.status === 'queued');
  if (!busy) {
    loadFolders();
    loadFiles();
  }
}

function renderUploadQueue() {
  const list = $('#upload-queue');
  list.replaceChildren();
  for (const item of state.uploadQueue) {
    const badge = badgeFor(item.file.name);
    const statusText =
      item.status === 'queued'
        ? '等待上传'
        : item.status === 'uploading'
          ? `上传中 ${Math.round(item.progress * 100)}%`
          : item.status === 'done'
            ? '已完成'
            : item.error || '上传失败';
    const li = el(
      'li',
      { class: `upload-item ${item.status === 'done' ? 'done' : item.status === 'error' ? 'error' : ''}`, id: `up-${item.id}` },
      el('span', { class: `file-badge ${badge.cls}`, text: badge.label }),
      el(
        'div',
        { class: 'upload-info' },
        el('div', { class: 'upload-name', text: item.file.name, title: item.file.name }),
        el('div', { class: 'upload-status', id: `up-status-${item.id}`, text: statusText }),
        el(
          'div',
          { class: 'upload-bar' },
          el('i', { id: `up-bar-${item.id}`, style: `width:${item.status === 'done' ? 100 : Math.max(2, item.progress * 100)}%` })
        )
      ),
      item.status === 'uploading' || item.status === 'queued'
        ? el('button', {
            class: 'icon-btn',
            type: 'button',
            title: '取消',
            onclick: () => {
              if (item.xhr) item.xhr.abort();
              else {
                item.status = 'error';
                item.error = '已取消';
                renderUploadQueue();
                pumpUploads();
              }
            },
          }, iconEl('close'))
        : item.status === 'done'
          ? iconEl('check')
          : iconEl('alert')
    );
    list.append(li);
  }
  updateUploadSummary();
}

function updateUploadSummary() {
  const total = state.uploadQueue.length;
  const done = state.uploadQueue.filter((u) => u.status === 'done').length;
  const failed = state.uploadQueue.filter((u) => u.status === 'error').length;
  if (!total) {
    $('#upload-summary').textContent = '';
    return;
  }
  $('#upload-summary').textContent =
    `已完成 ${done} / ${total}` + (failed ? ` · 失败 ${failed}` : '');
}

/* --------------------------------------------------------------------------
   预览
   -------------------------------------------------------------------------- */

async function openPreview(file) {
  const ext = extOf(file.name);
  const src = `/api/download/${file.id}?inline=1`;
  $('#preview-title').textContent = file.name;
  $('#preview-meta').textContent = `${fmtSize(file.size)} · ${file.uploaded_by} · ${fmtTime(file.uploaded_at)}`;
  $('#preview-download').href = `/api/download/${file.id}`;
  const body = $('#preview-body');
  body.replaceChildren();

  if (IMAGE_EXTS.has(ext)) {
    body.append(el('img', { src, alt: file.name }));
  } else if (ext === 'pdf') {
    body.append(el('iframe', { src: `${src}#view=FitH`, title: file.name }));
  } else if (AUDIO_EXTS.has(ext)) {
    body.append(el('audio', { src, controls: true, style: 'width:min(560px,90%);padding:20px' }));
  } else if (VIDEO_EXTS.has(ext)) {
    body.append(el('video', { src, controls: true, style: 'max-width:100%;max-height:100%' }));
  } else if (TEXT_EXTS.has(ext)) {
    if (file.size > 2 * 1024 * 1024) {
      body.append(previewFallback('文件较大，建议下载后查看'));
    } else {
      body.append(el('div', { class: 'preview-loading', text: '正在读取…' }));
      try {
        const res = await fetch(src, { credentials: 'same-origin' });
        if (!res.ok) throw new Error('读取失败');
        const text = await res.text();
        body.replaceChildren(el('pre', { text }));
      } catch {
        body.replaceChildren(previewFallback('无法读取文本内容，请下载后查看'));
      }
    }
  } else {
    body.append(previewFallback('这种格式暂不支持在线预览'));
  }
  openModal('preview-modal');
}

function previewFallback(text) {
  return el(
    'div',
    { class: 'preview-fallback' },
    iconEl('file'),
    el('strong', { text }),
    el('p', { text: '点击右上角「下载」用本地软件打开。' })
  );
}

/* --------------------------------------------------------------------------
   重命名 / 新建文件夹
   -------------------------------------------------------------------------- */

function openRename(file) {
  state.renameFile = file;
  $('#rename-input').value = file.name;
  openModal('rename-modal');
  setTimeout(() => {
    const input = $('#rename-input');
    const dot = file.name.lastIndexOf('.');
    input.focus();
    input.setSelectionRange(0, dot > 0 ? dot : file.name.length);
  }, 60);
}

async function confirmRename() {
  const file = state.renameFile;
  if (!file) return;
  const name = $('#rename-input').value.trim();
  if (!name) {
    toast('文件名不能为空', 'error');
    return;
  }
  const btn = $('#rename-confirm');
  setBusy(btn, true);
  try {
    await api(`/api/file/${file.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    closeModal('rename-modal');
    state.renameFile = null;
    toast('已重命名');
    await loadFiles();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}

function openNewFolder() {
  $('#folder-name').value = '';
  openModal('folder-modal');
}

async function confirmNewFolder() {
  const name = $('#folder-name').value.trim();
  if (!name) {
    toast('请输入文件夹名称', 'error');
    return;
  }
  const btn = $('#folder-confirm');
  setBusy(btn, true);
  const path = state.folder ? `${state.folder}/${name}` : name;
  try {
    await api('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    closeModal('folder-modal');
    toast('文件夹已创建');
    await Promise.all([loadFolders(), loadFiles()]);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}

/* --------------------------------------------------------------------------
   成员管理
   -------------------------------------------------------------------------- */

async function loadMembers() {
  try {
    const data = await api('/api/members');
    state.members = data.members || [];
    renderMembers();
    $('#page-title').textContent = '成员管理';
    $('#page-sub').textContent = `${state.members.length} 位成员 · 管理员可调整角色与审批`;
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderMembers() {
  const tbody = $('#member-tbody');
  tbody.replaceChildren();
  for (const m of state.members) {
    const isSelf = m.email === state.me.email;

    const roleSelect = el('select', { class: 'member-role-select', 'aria-label': `调整 ${m.email} 的角色` });
    for (const [value, label] of [['admin', '管理员'], ['member', '成员'], ['viewer', '只读']]) {
      const opt = el('option', { value, text: label });
      if (m.role === value) opt.selected = true;
      roleSelect.append(opt);
    }
    roleSelect.disabled = isSelf;
    roleSelect.addEventListener('change', () => updateMember(m, { role: roleSelect.value }, roleSelect));

    const status = el(
      'span',
      { class: `status-pill ${m.status === 'active' ? '' : 'pending'}` },
      m.status === 'active' ? '正常' : '待批准'
    );

    const actions = el('div', { class: 'row-actions' });
    if (m.status === 'pending') {
      actions.append(
        el('button', {
          class: 'btn btn-sm btn-outline',
          type: 'button',
          text: '批准',
          onclick: () => updateMember(m, { status: 'active' }),
        })
      );
    }
    if (!isSelf) {
      actions.append(iconBtn('trash', '移除成员', () => removeMember(m), 'danger'));
    }
    tbody.append(
      el(
        'tr',
        {},
        el(
          'td',
          {},
          el(
            'div',
            { class: 'user-chip' },
            el('span', { class: 'mini-avatar', text: (m.name || m.email).charAt(0).toUpperCase() }),
            el(
              'div',
              { style: 'min-width:0' },
              el('div', { style: 'font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap', text: m.name || m.email.split('@')[0] }),
              el('div', { style: 'font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis', text: m.email })
            )
          )
        ),
        el('td', {}, roleSelect),
        el('td', {}, status),
        el('td', { class: 'hide-sm cell-muted', text: `${m.file_count || 0} 个 · ${fmtSize(m.bytes)}` }),
        el('td', { class: 'hide-md cell-muted', text: fmtTime(m.created_at) }),
        el('td', { class: 'col-actions' }, actions)
      )
    );
  }
}

async function updateMember(member, patch, control) {
  if (control) control.disabled = true;
  try {
    await api('/api/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: member.email, ...patch }),
    });
    toast('成员信息已更新');
    await loadMembers();
  } catch (err) {
    toast(err.message, 'error');
    await loadMembers();
  }
}

async function removeMember(member) {
  const ok = await confirmDialog({
    title: '移除成员',
    text: `将 ${member.email} 移出成员列表？其已上传的文件不会被删除，但本人将无法再进入平台。`,
    okText: '移除',
  });
  if (!ok) return;
  try {
    await api(`/api/members?email=${encodeURIComponent(member.email)}`, { method: 'DELETE' });
    toast('已移除成员');
    await loadMembers();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function addMember(event) {
  event.preventDefault();
  const email = $('#member-email').value.trim();
  const name = $('#member-name').value.trim();
  const role = $('#member-role').value;
  if (!email) return;
  try {
    await api('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role }),
    });
    $('#member-email').value = '';
    $('#member-name').value = '';
    toast('成员已添加');
    await loadMembers();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* --------------------------------------------------------------------------
   操作日志
   -------------------------------------------------------------------------- */

async function loadActivity() {
  try {
    const data = await api('/api/activity?limit=150');
    renderActivity(data.activity || []);
    $('#page-title').textContent = '操作日志';
    $('#page-sub').textContent = '最近 150 条上传、删除、成员变更等记录';
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderActivity(rows) {
  const list = $('#activity-list');
  list.replaceChildren();
  if (!rows.length) {
    list.append(el('div', { class: 'empty-state', style: 'border:0;background:transparent' }, el('p', { text: '还没有操作记录' })));
    return;
  }
  for (const row of rows) {
    list.append(
      el(
        'div',
        { class: 'activity-item' },
        el('span', { class: 'activity-time', text: fmtTime(row.at) }),
        el(
          'div',
          { class: 'activity-main' },
          el('span', { class: 'activity-badge', text: ACTION_LABEL[row.action] || row.action }),
          el('strong', { text: row.display_name || row.email }),
          el('span', { text: row.target ? ` · ${row.target}` : '' })
        ),
        el('span', { class: 'activity-target', text: row.detail || '' })
      )
    );
  }
}

/* --------------------------------------------------------------------------
   视图切换
   -------------------------------------------------------------------------- */

function updateNav() {
  $$('.nav-item[data-nav]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.nav === state.view);
  });
}

function updateViewChrome() {
  const isFileView = ['files', 'mine', 'trash'].includes(state.view);
  $('#files-section').hidden = !isFileView;
  $('#members-section').hidden = state.view !== 'members';
  $('#activity-section').hidden = state.view !== 'activity';
  $('#folders-section').hidden = state.view !== 'files' || !state.subfolders.length;
  $('.page-actions').hidden = !isFileView;
  $('#new-folder-btn-main').hidden = state.view !== 'files';
  $('#upload-btn').hidden = !isFileView || !(state.me.role === 'admin' || state.me.role === 'member');
  $('.search-wrap').hidden = !isFileView;
  if (!isFileView) {
    $('#folders-section').hidden = true;
    $('#breadcrumb').replaceChildren();
  }
}

async function setView(view) {
  state.view = view;
  state.folder = '';
  state.query = '';
  state.page = 1;
  state.selected.clear();
  $('#search-input').value = '';
  $('#search-clear').hidden = true;
  updateNav();
  updateViewChrome();
  closeSidebar();
  if (view === 'members') await loadMembers();
  else if (view === 'activity') await loadActivity();
  else await loadFiles();
}

/* --------------------------------------------------------------------------
   侧栏（移动端）
   -------------------------------------------------------------------------- */

function openSidebar() {
  $('#sidebar').classList.add('open');
  $('#sidebar-scrim').hidden = false;
}
function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebar-scrim').hidden = true;
}

/* --------------------------------------------------------------------------
   事件绑定
   -------------------------------------------------------------------------- */

function bindEvents() {
  $$('.nav-item[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => setView(btn.dataset.nav));
  });

  $('#menu-btn').addEventListener('click', openSidebar);
  $('#sidebar-scrim').addEventListener('click', closeSidebar);

  $('#upload-btn').addEventListener('click', openUpload);
  $('#empty-upload').addEventListener('click', openUpload);
  $('#pick-files').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length) {
      openUpload();
      addFiles(e.target.files);
      e.target.value = '';
    }
  });

  $('#new-folder-btn').addEventListener('click', openNewFolder);
  $('#new-folder-btn-main').addEventListener('click', openNewFolder);
  $('#folder-confirm').addEventListener('click', confirmNewFolder);
  $('#folder-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmNewFolder();
  });

  $('#move-confirm').addEventListener('click', confirmMove);
  $('#rename-confirm').addEventListener('click', confirmRename);
  $('#rename-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmRename();
  });

  $('#refresh-btn').addEventListener('click', async () => {
    await Promise.all([loadFolders(), loadFiles()]);
    toast('已刷新');
  });
  $('#activity-refresh').addEventListener('click', loadActivity);

  $('#batch-download').addEventListener('click', batchDownload);
  $('#batch-move').addEventListener('click', () => openMove([...state.selected]));
  $('#batch-delete').addEventListener('click', batchDelete);
  $('#batch-restore').addEventListener('click', batchRestore);
  $('#batch-purge').addEventListener('click', batchPurge);
  $('#batch-clear').addEventListener('click', clearSelection);

  $('#select-all').addEventListener('change', (e) => {
    if (e.target.checked) {
      state.files.forEach((f) => state.selected.add(f.id));
    } else {
      state.selected.clear();
    }
    renderTable();
  });

  $('#page-prev').addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      loadFiles();
    }
  });
  $('#page-next').addEventListener('click', () => {
    const pages = Math.max(1, Math.ceil(state.total / state.pageSize));
    if (state.page < pages) {
      state.page++;
      loadFiles();
    }
  });

  let searchTimer = null;
  $('#search-input').addEventListener('input', (e) => {
    const value = e.target.value;
    $('#search-clear').hidden = !value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = value.trim();
      state.page = 1;
      state.selected.clear();
      if (state.query && state.view !== 'files') {
        state.view = 'files';
        updateNav();
        updateViewChrome();
      }
      loadFiles();
    }, 280);
  });
  $('#search-clear').addEventListener('click', () => {
    $('#search-input').value = '';
    $('#search-clear').hidden = true;
    state.query = '';
    state.page = 1;
    loadFiles();
  });

  $('#member-form').addEventListener('submit', addMember);

  document.addEventListener('click', (e) => {
    const closer = e.target.closest('[data-close]');
    if (closer) {
      closeModal(closer.dataset.close);
      return;
    }
    if (e.target.classList.contains('modal-backdrop')) {
      closeModal(e.target.id);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const open = $$('.modal-backdrop:not([hidden])').pop();
      if (open) closeModal(open.id);
      else closeSidebar();
    }
  });

  $('#confirm-ok').addEventListener('click', () => {
    const resolve = state.confirmResolve;
    state.confirmResolve = null;
    closeModal('confirm-modal');
    if (resolve) resolve(true);
  });

  let dragTimer = null;
  const isFileDrag = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  ['dragenter', 'dragover'].forEach((type) => {
    document.addEventListener(type, (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      if (!(state.me.role === 'admin' || state.me.role === 'member')) return;
      document.body.classList.add('dragging');
      clearTimeout(dragTimer);
    });
  });
  document.addEventListener('dragleave', (e) => {
    if (!isFileDrag(e)) return;
    clearTimeout(dragTimer);
    dragTimer = setTimeout(() => document.body.classList.remove('dragging'), 80);
  });
  document.addEventListener('drop', (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    document.body.classList.remove('dragging');
    if (!(state.me.role === 'admin' || state.me.role === 'member')) {
      toast('当前账号只有下载权限', 'error');
      return;
    }
    if (!e.dataTransfer.files.length) return;
    openUpload();
    addFiles(e.dataTransfer.files);
  });

  const dropzone = $('#dropzone');
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });

  window.addEventListener('online', () => toast('网络已恢复'));
  window.addEventListener('offline', () => toast('网络已断开，上传可能中断', 'error'));
}

/* --------------------------------------------------------------------------
   启动
   -------------------------------------------------------------------------- */

bindEvents();
boot();
