// Cloudflare Pages API 小工具（只读 + 少量写），避免每次临时写脚本。
// 用法：
//   node tools/_cf.mjs projects                       列出所有 Pages 项目
//   node tools/_cf.mjs project <name>                 项目详情
//   node tools/_cf.mjs deployments <name>             最近部署
//   node tools/_cf.mjs buildcfg <name> <buildCmd> <outDir> [rootDir]   设置构建配置
//   node tools/_cf.mjs deploy <name> [branch]         触发一次构建
//   node tools/_cf.mjs delete <name>                  删除项目（危险）
import https from 'node:https';
import fs from 'node:fs';

const ACC = '24c86e80a1c0e1459c679cd3ae0508ea';
const TOML = 'C:/Users/21971/AppData/Roaming/xdg.config/.wrangler/config/default.toml';
const token = fs.readFileSync(TOML, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/)[1];

function cf(method, path, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        host: 'api.cloudflare.com',
        path,
        method,
        timeout: 40000,
        headers: Object.assign(
          { authorization: 'Bearer ' + token, 'user-agent': 'dsh' },
          data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {},
        ),
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(b); } catch { /* 非 JSON */ }
          resolve({ status: res.statusCode, json, raw: b });
        });
      },
    );
    req.on('error', (e) => resolve({ status: 'ERR', raw: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', raw: '' }); });
    if (data) req.write(data);
    req.end();
  });
}

const [cmd, ...args] = process.argv.slice(2);
const base = `/client/v4/accounts/${ACC}/pages/projects`;

(async () => {
  if (cmd === 'projects') {
    const r = await cf('GET', base);
    for (const p of r.json.result) {
      const src = p.source ? `${p.source.config.owner}/${p.source.config.repo_name}` : 'direct-upload';
      console.log(`${p.name.padEnd(22)} ${src.padEnd(28)} ${p.domains.join(',')}`);
    }
  } else if (cmd === 'project') {
    const r = await cf('GET', `${base}/${args[0]}`);
    console.log(JSON.stringify({ source: r.json.result.source, build_config: r.json.result.build_config, domains: r.json.result.domains }, null, 1));
  } else if (cmd === 'deployments') {
    const r = await cf('GET', `${base}/${args[0]}/deployments?per_page=5`);
    for (const d of r.json.result || []) {
      const stages = (d.stages || []).map((s) => `${s.name}:${s.status}`).join(' ');
      console.log(`${d.created_on}\n  env=${d.environment} url=${d.url}\n  ${stages}`);
    }
  } else if (cmd === 'deployment') {
    // 单个部署的完整阶段明细（含 status / started_on / ended_on）
    const r = await cf('GET', `${base}/${args[0]}/deployments/${args[1]}`);
    console.log(JSON.stringify(r.json.result && { url: r.json.result.url, stages: r.json.result.stages }, null, 1));
  } else if (cmd === 'buildcfg') {
    // 用法：node tools/_cf.mjs buildcfg <name> root_dir=02_站点 destination_dir=. build_command=node -e "..."
    // 用 key=value 传参，避免 PowerShell 把空字符串参数吞掉
    const name = args[0];
    const kv = {};
    for (const a of args.slice(1)) {
      const i = a.indexOf('=');
      if (i > 0) kv[a.slice(0, i)] = a.slice(i + 1);
    }
    const body = { build_config: {} };
    for (const k of ['build_command', 'destination_dir', 'root_dir']) {
      if (k in kv) body.build_config[k] = kv[k];
    }
    const r = await cf('PATCH', `${base}/${name}`, body);
    console.log('status', r.status, r.status === 200 ? JSON.stringify(r.json.result.build_config) : r.raw.slice(0, 400));
  } else if (cmd === 'logs') {
    // node tools/_cf.mjs logs <project> [deploymentId]
    const name = args[0];
    let id = args[1];
    if (!id) {
      const r = await cf('GET', `${base}/${name}/deployments?per_page=1`);
      id = r.json.result[0].id;
    }
    const r = await cf('GET', `${base}/${name}/deployments/${id}/history/logs`);
    if (r.json && r.json.result) {
      for (const line of r.json.result.data || r.json.result) {
        const ts = line.timestamp ? new Date(line.timestamp).toISOString().slice(11, 19) : '';
        console.log(`${ts} ${line.line || line.message || JSON.stringify(line)}`);
      }
    } else {
      console.log('status', r.status, r.raw.slice(0, 800));
    }
  } else if (cmd === 'deploy') {
    const [name, branch] = args;
    const r = await cf('POST', `${base}/${name}/deployments`, { branch: branch || 'main' });
    console.log('status', r.status);
    console.log(r.status === 200 ? JSON.stringify(r.json.result.stages || r.json.result, null, 1).slice(0, 600) : r.raw.slice(0, 500));
  } else if (cmd === 'delete') {
    const r = await cf('DELETE', `${base}/${args[0]}`);
    console.log('status', r.status, r.raw.slice(0, 200));
  } else {
    console.log('unknown command');
  }
})();
