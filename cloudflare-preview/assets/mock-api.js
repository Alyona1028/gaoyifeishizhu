/* ==========================================================================
   静态预览版 · 浏览器内模拟后端
   --------------------------------------------------------------------------
   这个文件只在 cloudflare-preview 里使用。
   它拦截 /api/* 请求，用内存里的示例数据回答，因此不需要 D1、R2 或任何绑定。
   刷新页面后，示例数据会恢复原样；上传、改名、删除等操作只在当前标签页临时生效。
   ========================================================================== */

(() => {
  'use strict';

  const realFetch = window.fetch.bind(window);
  const ORIGIN = location.origin;
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const iso = (msAgo = 0) => new Date(now - msAgo).toISOString();
  const uid = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  const me = {
    email: 'lin@university.edu.cn',
    name: '林同学',
    role: 'admin',
  };

  const folderDefs = [
    { path: '海关法', name: '海关法' },
    { path: '海关法/案例', name: '案例' },
    { path: '论文', name: '论文' },
    { path: '论文/文献综述', name: '文献综述' },
    { path: '组会记录', name: '组会记录' },
  ];
  const folders = folderDefs.map((f) => ({ ...f }));

  const contents = {
    tariff: `# 2026 年关税调整方案要点（示例）

> 这是预览版内置的示例资料，仅用于展示阅读体验，不是真实政策文件。

## 一、总体思路

坚持稳中求进，统筹发展和安全，继续对部分商品实施进口暂定税率，支持国内产业升级和民生保障。

## 二、重点方向

1. 对先进制造业、关键零部件等商品实施较低的进口暂定税率。
2. 对部分资源性商品、农产品保留必要的调控措施。
3. 继续落实区域全面经济伙伴关系协定（RCEP）等自贸协定税率。

## 三、课题组关注点

- 暂定税率与最惠国税率的适用顺序
- 原产地规则对关税成本的影响
- 跨境电商零售进口的税收政策衔接

（示例文本，共 3 个小节。）`,
    cases: `海关行政处罚案例汇编（示例）

【案例一】某公司申报不实影响税款征收
基本案情：当事人进口货物时，申报的商品归类与实际不符，导致少缴税款。
处理结果：海关依法追征税款，并处以罚款。
争点提示：归类错误的主观状态、主动披露情节的认定。

【案例二】某企业未按规定保管海关监管货物
基本案情：当事人在海关监管期内擅自处置监管货物。
处理结果：海关责令改正，并依法处罚。
争点提示：监管货物的范围、处置行为的持续时间。

【案例三】某跨境电商企业申报价格不实
基本案情：当事人低报成交价格，影响税款征收。
处理结果：海关依法处理。
争点提示：成交价格调整项目、特许权使用费的计入。

说明：以上均为预览版虚构示例，不对应任何真实案件。`,
    review: `# 跨境电商监管研究综述（示例）

## 1. 研究背景

跨境电商零售进口在交易模式、物流路径和税收征管上都与传统一般贸易不同，监管规则仍在持续调整。

## 2. 主要讨论

- **税收征管**：零售进口商品是否应按货物还是物品征税，实践中存在争议。
- **消费者保护**：平台责任、信息披露和退换货规则是讨论重点。
- **数据与合规**：订单、支付、物流“三单”比对是监管的技术基础。

## 3. 可进一步研究的问题

1. 不同监管模式下的税负比较。
2. 平台责任与海关监管的边界。
3. 数字贸易规则对国内海关制度的影响。

（示例文本，仅用于展示 Markdown 预览效果。）`,
    minutes: `课题组第 12 次组会纪要（示例）

时间：2026 年 10 月 18 日 19:00
地点：线上会议
参会：王老师、陈同学、李同学、林同学

一、上周工作回顾
1. 陈同学汇报了海关行政处罚案例的初步整理情况。
2. 李同学介绍了跨境电商监管文献的检索结果。
3. 林同学演示了资料库的页面原型。

二、讨论要点
- 案例整理要先确定筛选标准，再统一字段。
- 文献综述需要区分“监管模式”与“税收政策”两条线。
- 资料库先解决“能上传、能找到、能下载”，不要一开始堆太多功能。

三、下周安排
1. 每人提交一篇文献摘要。
2. 陈同学补充 5 个典型案例。
3. 林同学继续完善资料库的移动端体验。

（示例文本，仅用于展示文本预览效果。）`,
    csv: `序号,文件名称,主题,年份,备注
1,关税调整方案要点,关税,2026,示例
2,海关行政处罚案例汇编,行政处罚,2025,示例
3,跨境电商监管研究综述,跨境电商,2025,示例
4,组会纪要第12次,组会,2026,示例`,
    review2: `# 数字贸易规则研究述评（示例）

## 一、问题的提出

数字贸易的快速发展，使数据跨境流动、数字服务税和电子认证等议题进入国际贸易规则讨论。

## 二、既有研究的三条路径

1. **规则文本比较**：比较 CPTPP、DEPA 等协定中的数字贸易条款。
2. **国内法衔接**：讨论数据安全法、个人信息保护法与贸易规则的协调。
3. **海关监管**：关注跨境电商、数字交付和原产地规则。

## 三、简短评价

现有研究对规则文本的梳理较充分，但对海关执法层面的可操作性讨论仍然不足。

（示例文本，仅用于展示 Markdown 预览效果。）`,
    deleted: `旧版书目清单（示例）

1. 海关法总论
2. 关税法专题
3. 海关行政处罚案例研究
4. 跨境电商监管资料汇编

（这是一份已移入回收站的示例文件。）`,
  };

  const encoder = new TextEncoder();
  const bytes = (text) => encoder.encode(text).length;

  const files = [
    {
      id: 'f-tariff',
      name: '2026年关税调整方案要点.md',
      folder: '海关法',
      size: bytes(contents.tariff),
      type: 'text/markdown; charset=utf-8',
      content: contents.tariff,
      uploaded_by: 'wang@university.edu.cn',
      uploaded_at: iso(2 * 60 * 60 * 1000),
    },
    {
      id: 'f-cases',
      name: '海关行政处罚案例汇编（2025）.txt',
      folder: '海关法/案例',
      size: bytes(contents.cases),
      type: 'text/plain; charset=utf-8',
      content: contents.cases,
      uploaded_by: 'chen@university.edu.cn',
      uploaded_at: iso(DAY + 3 * 60 * 60 * 1000),
    },
    {
      id: 'f-review',
      name: '跨境电商监管研究综述.md',
      folder: '论文',
      size: bytes(contents.review),
      type: 'text/markdown; charset=utf-8',
      content: contents.review,
      uploaded_by: 'li@university.edu.cn',
      uploaded_at: iso(3 * DAY),
    },
    {
      id: 'f-minutes',
      name: '课题组第12次组会纪要.txt',
      folder: '组会记录',
      size: bytes(contents.minutes),
      type: 'text/plain; charset=utf-8',
      content: contents.minutes,
      uploaded_by: 'lin@university.edu.cn',
      uploaded_at: iso(5 * DAY),
    },
    {
      id: 'f-csv',
      name: '关税法条文对照表（示例）.csv',
      folder: '海关法',
      size: bytes(contents.csv),
      type: 'text/csv; charset=utf-8',
      content: contents.csv,
      uploaded_by: 'wang@university.edu.cn',
      uploaded_at: iso(8 * DAY),
    },
    {
      id: 'f-review2',
      name: '数字贸易规则研究述评.md',
      folder: '论文/文献综述',
      size: bytes(contents.review2),
      type: 'text/markdown; charset=utf-8',
      content: contents.review2,
      uploaded_by: 'li@university.edu.cn',
      uploaded_at: iso(12 * DAY),
    },
    {
      id: 'f-deleted',
      name: '旧版书目清单.txt',
      folder: '海关法',
      size: bytes(contents.deleted),
      type: 'text/plain; charset=utf-8',
      content: contents.deleted,
      uploaded_by: 'lin@university.edu.cn',
      uploaded_at: iso(20 * DAY),
      deleted_at: iso(2 * DAY),
      deleted_by: 'lin@university.edu.cn',
    },
  ];

  let members = [
    {
      email: 'lin@university.edu.cn',
      name: '林同学',
      role: 'admin',
      status: 'active',
      created_at: iso(120 * DAY),
      last_seen_at: iso(10 * 60 * 1000),
    },
    {
      email: 'wang@university.edu.cn',
      name: '王老师',
      role: 'admin',
      status: 'active',
      created_at: iso(180 * DAY),
      last_seen_at: iso(2 * 60 * 60 * 1000),
    },
    {
      email: 'chen@university.edu.cn',
      name: '陈同学',
      role: 'member',
      status: 'active',
      created_at: iso(90 * DAY),
      last_seen_at: iso(DAY),
    },
    {
      email: 'li@university.edu.cn',
      name: '李同学',
      role: 'viewer',
      status: 'active',
      created_at: iso(60 * DAY),
      last_seen_at: iso(3 * DAY),
    },
    {
      email: 'new@university.edu.cn',
      name: '新同学',
      role: 'member',
      status: 'pending',
      created_at: iso(6 * 60 * 60 * 1000),
      last_seen_at: iso(6 * 60 * 60 * 1000),
    },
  ];

  const activity = [
    {
      at: iso(2 * 60 * 60 * 1000),
      email: 'wang@university.edu.cn',
      display_name: '王老师',
      action: 'upload',
      target: '2026年关税调整方案要点.md',
      detail: '海关法',
    },
    {
      at: iso(3 * 60 * 60 * 1000),
      email: 'chen@university.edu.cn',
      display_name: '陈同学',
      action: 'upload',
      target: '海关行政处罚案例汇编（2025）.txt',
      detail: '海关法/案例',
    },
    {
      at: iso(DAY),
      email: 'li@university.edu.cn',
      display_name: '李同学',
      action: 'upload',
      target: '跨境电商监管研究综述.md',
      detail: '论文',
    },
    {
      at: iso(2 * DAY),
      email: 'lin@university.edu.cn',
      display_name: '林同学',
      action: 'delete',
      target: '旧版书目清单.txt',
      detail: '移入回收站',
    },
    {
      at: iso(3 * DAY),
      email: 'lin@university.edu.cn',
      display_name: '林同学',
      action: 'folder_create',
      target: '论文/文献综述',
      detail: '',
    },
    {
      at: iso(4 * DAY),
      email: 'lin@university.edu.cn',
      display_name: '林同学',
      action: 'member_add',
      target: '李同学',
      detail: 'li@university.edu.cn · 只读',
    },
  ];

  /* ------------------------------------------------------------------------
     工具
     ------------------------------------------------------------------------ */

  function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  function fail(message, status = 400) {
    return json({ ok: false, error: message }, status);
  }

  function normalizeFolder(value) {
    return String(value || '')
      .replace(/\\/g, '/')
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean)
      .join('/');
  }

  function parentOf(path) {
    const i = path.lastIndexOf('/');
    return i < 0 ? '' : path.slice(0, i);
  }

  function inFolder(file, path) {
    return file.folder === path || file.folder.startsWith(`${path}/`);
  }

  function activeFiles() {
    return files.filter((file) => !file.deleted_at);
  }

  function storage() {
    const list = activeFiles();
    return {
      files: list.length,
      bytes: list.reduce((sum, file) => sum + (Number(file.size) || 0), 0),
    };
  }

  function countIn(path) {
    return activeFiles().filter((file) => inFolder(file, path)).length;
  }

  function ensureFolder(path) {
    if (!path) return;
    const parts = path.split('/');
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!folders.some((folder) => folder.path === current)) {
        folders.push({ path: current, name: part });
      }
    }
  }

  function publicFile(file) {
    const { content, _blob, ...rest } = file;
    return {
      ...rest,
      can_edit: me.role === 'admin' || file.uploaded_by === me.email,
      can_purge: me.role === 'admin',
    };
  }

  function log(action, target, detail = '') {
    activity.unshift({
      at: iso(0),
      email: me.email,
      display_name: me.name,
      action,
      target,
      detail,
    });
  }

  function childrenOf(path) {
    return folders
      .filter((folder) => folder.path !== path && parentOf(folder.path) === path)
      .sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
      .map((folder) => ({
        path: folder.path,
        name: folder.name,
        depth: folder.path.split('/').length - 1,
        count: countIn(folder.path),
      }));
  }

  function allFolders() {
    return [...folders]
      .sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
      .map((folder) => ({
        path: folder.path,
        name: folder.name,
        depth: folder.path.split('/').length - 1,
        count: countIn(folder.path),
      }));
  }

  function breadcrumbOf(path) {
    const crumbs = [{ name: '全部文件', path: '' }];
    let current = '';
    for (const part of path.split('/').filter(Boolean)) {
      current = current ? `${current}/${part}` : part;
      crumbs.push({ name: part, path: current });
    }
    return crumbs;
  }

  function contentType(file) {
    if (file.type) return file.type;
    const ext = String(file.name).split('.').pop().toLowerCase();
    const map = {
      md: 'text/markdown; charset=utf-8',
      txt: 'text/plain; charset=utf-8',
      csv: 'text/csv; charset=utf-8',
      json: 'application/json; charset=utf-8',
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mp3: 'audio/mpeg',
    };
    return map[ext] || 'application/octet-stream';
  }

  function blobOf(file) {
    if (file._blob instanceof Blob) return file._blob;
    return new Blob([file.content || `这是预览版示例文件：${file.name}\n`], {
      type: contentType(file),
    });
  }

  async function readJson(init) {
    if (!init.body) return {};
    if (typeof init.body === 'string') {
      try {
        return JSON.parse(init.body);
      } catch {
        return {};
      }
    }
    return {};
  }

  /* ------------------------------------------------------------------------
     API
     ------------------------------------------------------------------------ */

  async function handleApi(url, init) {
    const method = String(init.method || 'GET').toUpperCase();
    const path = url.pathname;

    if (path === '/api/health') {
      return json({ ok: true, bindings: { db: true, r2: true }, demo: true });
    }

    if (path === '/api/me') {
      return json({
        ok: true,
        user: me,
        config: { maxUploadMB: 95, demo: true },
        storage: storage(),
      });
    }

    if (path === '/api/files') {
      const view = url.searchParams.get('view') || 'files';
      const folder = normalizeFolder(url.searchParams.get('folder') || '');
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const pageSize = Math.max(1, Math.min(200, Number(url.searchParams.get('pageSize')) || 50));

      let list;
      if (view === 'trash') {
        list = files.filter((file) => file.deleted_at);
      } else if (view === 'mine') {
        list = activeFiles().filter((file) => file.uploaded_by === me.email);
      } else if (q) {
        list = activeFiles().filter((file) =>
          [file.name, file.folder, file.uploaded_by].join(' ').toLowerCase().includes(q)
        );
      } else {
        list = activeFiles().filter((file) => file.folder === folder);
      }

      list = [...list].sort((a, b) => String(b.uploaded_at).localeCompare(String(a.uploaded_at)));
      const total = list.length;
      const pageFiles = list.slice((page - 1) * pageSize, page * pageSize);

      return json({
        ok: true,
        files: pageFiles.map(publicFile),
        folders: q || view !== 'files' ? [] : childrenOf(folder),
        breadcrumb: view === 'files' ? breadcrumbOf(folder) : [],
        folder: view === 'files' ? folder : '',
        total,
        page,
        pageSize,
        storage: storage(),
      });
    }

    if (path === '/api/folders') {
      if (method === 'GET') {
        return json({ ok: true, folders: allFolders() });
      }
      if (method === 'POST') {
        const body = await readJson(init);
        const target = normalizeFolder(body.path);
        if (!target) return fail('文件夹名称不能为空');
        if (folders.some((folder) => folder.path === target)) return fail('文件夹已存在', 409);
        ensureFolder(target);
        log('folder_create', target);
        return json({ ok: true, path: target });
      }
      if (method === 'DELETE') {
        const target = normalizeFolder(url.searchParams.get('path') || '');
        if (!target) return fail('不能删除根目录');
        if (!folders.some((folder) => folder.path === target)) return fail('文件夹不存在', 404);
        const hasChild = folders.some((folder) => parentOf(folder.path) === target);
        const hasFiles = activeFiles().some((file) => inFolder(file, target));
        if (hasChild || hasFiles) return fail('文件夹不为空，请先移走或删除里面的文件', 409);
        const index = folders.findIndex((folder) => folder.path === target);
        folders.splice(index, 1);
        log('folder_delete', target);
        return json({ ok: true });
      }
    }

    if (path.startsWith('/api/download/')) {
      const id = decodeURIComponent(path.slice('/api/download/'.length));
      const file = files.find((item) => item.id === id);
      if (!file) return fail('文件不存在或已被删除', 404);
      return new Response(blobOf(file), {
        status: 200,
        headers: {
          'Content-Type': contentType(file),
          'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
          'Content-Length': String(file.size || 0),
        },
      });
    }

    if (path.startsWith('/api/file/') && method === 'PATCH') {
      const id = decodeURIComponent(path.slice('/api/file/'.length));
      const file = files.find((item) => item.id === id);
      if (!file) return fail('文件不存在', 404);
      if (file.deleted_at) return fail('文件在回收站中，请先恢复', 400);
      const body = await readJson(init);
      if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return fail('文件名不能为空');
        file.name = name;
      }
      if (body.folder !== undefined) {
        const folder = normalizeFolder(body.folder);
        ensureFolder(folder);
        file.folder = folder;
      }
      log('update', file.name, file.folder);
      return json({ ok: true, file: publicFile(file) });
    }

    if (path === '/api/batch' && method === 'POST') {
      const body = await readJson(init);
      const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
      const selected = files.filter((file) => ids.includes(file.id));
      if (!selected.length) return json({ ok: true, affected: 0 });

      if (body.action === 'delete') {
        let affected = 0;
        for (const file of selected) {
          if (!file.deleted_at) {
            file.deleted_at = iso(0);
            file.deleted_by = me.email;
            affected++;
          }
        }
        log('delete', selected.map((file) => file.name).join('、'), '移入回收站');
        return json({ ok: true, affected });
      }

      if (body.action === 'restore') {
        let affected = 0;
        for (const file of selected) {
          if (file.deleted_at) {
            delete file.deleted_at;
            delete file.deleted_by;
            affected++;
          }
        }
        log('restore', selected.map((file) => file.name).join('、'));
        return json({ ok: true, affected });
      }

      if (body.action === 'purge') {
        if (me.role !== 'admin') return fail('只有管理员可以彻底删除', 403);
        let affected = 0;
        for (const file of selected) {
          const index = files.indexOf(file);
          if (index >= 0) {
            files.splice(index, 1);
            affected++;
          }
        }
        log('purge', selected.map((file) => file.name).join('、'));
        return json({ ok: true, affected });
      }

      if (body.action === 'move') {
        const folder = normalizeFolder(body.folder);
        ensureFolder(folder);
        let affected = 0;
        for (const file of selected) {
          if (!file.deleted_at) {
            file.folder = folder;
            affected++;
          }
        }
        log('move', selected.map((file) => file.name).join('、'), folder || '根目录');
        return json({ ok: true, affected });
      }

      return fail('未知操作');
    }

    if (path === '/api/members') {
      if (method === 'GET') {
        return json({
          ok: true,
          members: members.map((member) => {
            const own = activeFiles().filter((file) => file.uploaded_by === member.email);
            return {
              ...member,
              file_count: own.length,
              bytes: own.reduce((sum, file) => sum + (Number(file.size) || 0), 0),
            };
          }),
        });
      }

      if (method === 'POST') {
        const body = await readJson(init);
        const email = String(body.email || '').trim().toLowerCase();
        if (!email.includes('@')) return fail('邮箱格式不正确');
        if (members.some((member) => member.email === email)) return fail('该邮箱已在成员列表中', 409);
        members.push({
          email,
          name: String(body.name || '').trim() || email.split('@')[0],
          role: ['admin', 'member', 'viewer'].includes(body.role) ? body.role : 'member',
          status: 'active',
          created_at: iso(0),
          last_seen_at: iso(0),
        });
        log('member_add', body.name || email, email);
        return json({ ok: true });
      }

      if (method === 'PATCH') {
        const body = await readJson(init);
        const member = members.find((item) => item.email === body.email);
        if (!member) return fail('成员不存在', 404);
        if (body.role && ['admin', 'member', 'viewer'].includes(body.role)) member.role = body.role;
        if (body.status && ['active', 'pending'].includes(body.status)) member.status = body.status;
        if (body.name !== undefined) member.name = String(body.name).trim();
        log('member_update', member.name, member.email);
        return json({ ok: true });
      }

      if (method === 'DELETE') {
        const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
        if (email === me.email) return fail('不能移除自己');
        const index = members.findIndex((member) => member.email === email);
        if (index < 0) return fail('成员不存在', 404);
        const [removed] = members.splice(index, 1);
        log('member_remove', removed.name, removed.email);
        return json({ ok: true });
      }
    }

    if (path === '/api/activity') {
      const limit = Math.min(150, Number(url.searchParams.get('limit')) || 150);
      return json({ ok: true, activity: activity.slice(0, limit) });
    }

    if (path === '/api/stats') {
      return json({ ok: true, files: storage().files, bytes: storage().bytes, members: members.length });
    }

    return fail(`预览版未模拟这个接口：${method} ${path}`, 404);
  }

  /* ------------------------------------------------------------------------
     拦截 fetch
     ------------------------------------------------------------------------ */

  window.fetch = async (input, init = {}) => {
    const raw = typeof input === 'string' ? input : input.url;
    const url = new URL(raw, ORIGIN);
    if (!url.pathname.startsWith('/api/')) return realFetch(input, init);
    await new Promise((resolve) => setTimeout(resolve, 90));
    try {
      return await handleApi(url, init);
    } catch (error) {
      return fail(error.message || '预览版内部错误', 500);
    }
  };

  /* ------------------------------------------------------------------------
     拦截上传（app.js 用 XHR 发送原始文件体）
     ------------------------------------------------------------------------ */

  class DemoXHR extends EventTarget {
    constructor() {
      super();
      this.upload = new EventTarget();
      this.status = 0;
      this.responseText = '';
      this._timer = null;
      this._aborted = false;
    }

    open(method, url) {
      this._method = method;
      this._url = url;
    }

    setRequestHeader() {
      /* 预览版不关心请求头 */
    }

    send(body) {
      const url = new URL(this._url, ORIGIN);
      const name = url.searchParams.get('name') || '未命名文件';
      const folder = normalizeFolder(url.searchParams.get('folder') || '');
      const type = url.searchParams.get('type') || '';
      const size = body && typeof body.size === 'number' ? body.size : 0;

      this._timer = setTimeout(() => {
        if (this._aborted) return;
        ensureFolder(folder);
        const file = {
          id: uid('f-'),
          name,
          folder,
          size,
          type: type || 'application/octet-stream',
          _blob: body instanceof Blob ? body : null,
          uploaded_by: me.email,
          uploaded_at: iso(0),
        };
        files.unshift(file);
        log('upload', name, folder || '根目录');
        this.status = 200;
        this.responseText = JSON.stringify({ ok: true, file: publicFile(file) });
        this.upload.dispatchEvent(
          new ProgressEvent('progress', {
            lengthComputable: true,
            loaded: Math.max(1, Math.floor(size * 0.65)),
            total: Math.max(1, size),
          })
        );
        setTimeout(() => {
          if (!this._aborted) this.dispatchEvent(new Event('load'));
        }, 180);
      }, 420);
    }

    abort() {
      this._aborted = true;
      clearTimeout(this._timer);
      this.status = 0;
      this.dispatchEvent(new Event('abort'));
    }
  }

  window.XMLHttpRequest = DemoXHR;

  /* ------------------------------------------------------------------------
     下载链接：演示版用 Blob 生成真实文件
     ------------------------------------------------------------------------ */

  document.addEventListener(
    'click',
    (event) => {
      const link = event.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';

      if (href.startsWith('/api/download/')) {
        event.preventDefault();
        const id = decodeURIComponent(href.slice('/api/download/'.length).split('?')[0]);
        const file = files.find((item) => item.id === id);
        if (!file) {
          toast('演示文件不存在');
          return;
        }
        const objectUrl = URL.createObjectURL(blobOf(file));
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = file.name;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
        toast('预览版：已生成示例文件');
        return;
      }

      if (href.startsWith('/api/zip')) {
        event.preventDefault();
        toast('预览版不提供 ZIP 打包，正式版可用');
      }
    },
    true
  );

  /* ------------------------------------------------------------------------
     顶部提示条
     ------------------------------------------------------------------------ */

  const banner = document.createElement('div');
  banner.textContent = '演示预览版 · 示例数据，刷新即还原';
  banner.setAttribute('aria-hidden', 'true');
  banner.style.cssText = [
    'position:fixed',
    'left:50%',
    'bottom:16px',
    'transform:translateX(-50%)',
    'z-index:80',
    'padding:7px 13px',
    'border-radius:999px',
    'background:rgba(29,29,31,.72)',
    'color:#fff',
    'font-size:11px',
    'letter-spacing:.02em',
    'backdrop-filter:blur(12px)',
    'box-shadow:0 6px 20px rgba(0,0,0,.16)',
    'pointer-events:none',
    'user-select:none',
  ].join(';');
  document.body.append(banner);
})();
