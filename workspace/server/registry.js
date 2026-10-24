// The projects Store Studio shows, remembered in a per-user workspace.json (server/index.js: defaultState):
// it holds local paths, so it never lives in the skill folder.
// A project is a folder with a studio.config.js. A path given on the command line is either a project or a
// folder of projects (searched two levels deep, so a repo with assets/template/ is found too). A folder of
// projects is remembered too and searched again whenever the page loads its project list, so a project
// created in it after Studio started shows up on the next page reload (no restart).
import fs from 'node:fs';
import path from 'node:path';

const SKIP = new Set(['node_modules', '.git', 'out', 'final', 'raw', 'screens', 'engine', 'scripts']);

export const isProject = (dir) => {
  try {
    return fs.statSync(path.join(dir, 'studio.config.js')).isFile();
  } catch {
    return false;
  }
};

export function discover(p, depth = 2) {
  const abs = path.resolve(p);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return [];
  if (isProject(abs)) return [abs];
  if (!depth) return [];
  return fs.readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !SKIP.has(d.name))
    .flatMap((d) => discover(path.join(abs, d.name), depth - 1))
    .sort();
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';

export class Registry {
  constructor(file) {
    this.file = file;
    this.projects = []; // [{ slug, root }]
    this.folders = []; // folders of projects, searched again by rescan()
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const p of data.projects || []) if (p && p.root) this.projects.push({ slug: p.slug, root: p.root });
      for (const f of data.folders || []) if (typeof f === 'string') this.folders.push(f);
    } catch {
      // first run: no workspace.json yet
    }
  }

  // a readable, unique slug: the folder name, or parent-folder for generic names like "template"
  slugFor(root) {
    const base = path.basename(root);
    const name = ['template', 'studio', 'store', 'app'].includes(base) ? `${path.basename(path.dirname(root))}-${base}` : base;
    let slug = slugify(name);
    for (let n = 2; this.projects.some((p) => p.slug === slug && p.root !== root); n++) slug = `${slugify(name)}-${n}`;
    return slug;
  }

  add(roots) {
    const added = [];
    for (const root of roots) {
      if (this.projects.some((p) => p.root === root)) continue;
      const entry = { slug: this.slugFor(root), root };
      this.projects.push(entry);
      added.push(entry);
    }
    return added;
  }

  // remember a folder of projects (not a project itself) so new projects in it are found later
  addFolder(dir) {
    const abs = path.resolve(dir);
    if (isProject(abs) || this.folders.includes(abs)) return;
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) this.folders.push(abs);
  }

  // search the remembered folders again -> the projects added
  rescan() {
    return this.add(this.folders.flatMap((f) => discover(f)));
  }

  forget(slug) {
    const before = this.projects.length;
    this.projects = this.projects.filter((p) => p.slug !== slug);
    return before !== this.projects.length;
  }

  // projects whose folder or config disappeared are kept in the file but not served
  live() {
    return this.projects.filter((p) => isProject(p.root));
  }

  get(slug) {
    return this.live().find((p) => p.slug === slug) || null;
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, `${JSON.stringify({ projects: this.projects, folders: this.folders }, null, 2)}\n`);
  }
}
