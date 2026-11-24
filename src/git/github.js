// Minimal GitHub client using the REST "Git Data" API (works from the browser with a personal access token).
// One push = one commit containing every project file; files removed locally are removed in the commit too.
export class GitHub {
  constructor({ token, owner, repo, branch = 'main', prefix = '' }, fetchFn) {
    Object.assign(this, { token, owner, repo, branch, prefix: prefix ? prefix.replace(/^\/|\/$/g, '') + '/' : '' });
    this.f = fetchFn || ((...a) => globalThis.fetch(...a));
    this.rp = `/repos/${owner}/${repo}`;
  }
  async api(method, path, body) {
    const r = await this.f('https://api.github.com' + path, {
      method,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${this.token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const txt = await r.text();
    let j = null;
    try { j = txt ? JSON.parse(txt) : null; } catch (e) { /* non-JSON */ }
    if (!r.ok) { const e = new Error((j && j.message) || r.statusText); e.status = r.status; throw e; }
    return j;
  }
  async test() { const r = await this.api('GET', this.rp); return { name: r.full_name, private: r.private, canPush: !!(r.permissions && r.permissions.push), defaultBranch: r.default_branch }; }
  async head(branch = this.branch) {
    try { return (await this.api('GET', `${this.rp}/git/ref/heads/${branch}`)).object.sha; } catch (e) { if (e.status === 404 || e.status === 409) return null; throw e; }
  }
  async ensureBranch() {
    let sha = await this.head();
    if (sha) return sha;
    const info = await this.test();
    const base = await this.head(info.defaultBranch);
    if (!base) { // brand-new empty repository: the contents API creates the first commit
      await this.api('PUT', `${this.rp}/contents/.gitkeep`, { message: 'Initialize repository', content: '', branch: this.branch });
      return this.head();
    }
    await this.api('POST', `${this.rp}/git/refs`, { ref: `refs/heads/${this.branch}`, sha: base });
    return base;
  }
  async push(files, message) {
    const parent = await this.ensureBranch();
    const commit = await this.api('GET', `${this.rp}/git/commits/${parent}`);
    const old = await this.api('GET', `${this.rp}/git/trees/${commit.tree.sha}?recursive=1`);
    const mine = (p) => p.startsWith(this.prefix) && (p === this.prefix + 'gatework.json' || p.startsWith(this.prefix + 'circuits/'));
    const keep = new Set(files.map((f) => this.prefix + f.path));
    const tree = [];
    for (const f of files) {
      const b = await this.api('POST', `${this.rp}/git/blobs`, { content: f.content, encoding: 'utf-8' });
      tree.push({ path: this.prefix + f.path, mode: '100644', type: 'blob', sha: b.sha });
    }
    (old.tree || []).forEach((t) => { if (t.type === 'blob' && mine(t.path) && !keep.has(t.path)) tree.push({ path: t.path, mode: '100644', type: 'blob', sha: null }); });
    const nt = await this.api('POST', `${this.rp}/git/trees`, { base_tree: commit.tree.sha, tree });
    const nc = await this.api('POST', `${this.rp}/git/commits`, { message, tree: nt.sha, parents: [parent] });
    await this.api('PATCH', `${this.rp}/git/refs/heads/${this.branch}`, { sha: nc.sha });
    return { sha: nc.sha, url: nc.html_url || `https://github.com/${this.owner}/${this.repo}/commit/${nc.sha}`, files: files.length };
  }
  async pull() {
    const sha = await this.head();
    if (!sha) throw new Error('Branch not found');
    const commit = await this.api('GET', `${this.rp}/git/commits/${sha}`);
    const t = await this.api('GET', `${this.rp}/git/trees/${commit.tree.sha}?recursive=1`);
    const want = t.tree.filter((e) => e.type === 'blob' && (e.path === this.prefix + 'gatework.json' || (e.path.startsWith(this.prefix + 'circuits/') && e.path.endsWith('.json'))));
    const map = {};
    for (const e of want) {
      const b = await this.api('GET', `${this.rp}/git/blobs/${e.sha}`);
      const bin = Uint8Array.from(atob(b.content.replace(/\s/g, '')), (c) => c.charCodeAt(0));
      map[e.path.slice(this.prefix.length)] = new TextDecoder().decode(bin);
    }
    return { map, sha };
  }
}
