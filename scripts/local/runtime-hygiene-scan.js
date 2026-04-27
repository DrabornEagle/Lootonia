const fs = require('fs');
const path = require('path');

const repo = process.cwd();
const outDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(repo, 'audit', 'ci_runtime_hygiene');
fs.mkdirSync(outDir, { recursive: true });

const targets = [path.join(repo, 'App.js'), path.join(repo, 'src')];
const exts = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ignoreParts = new Set(['node_modules', '.git', 'archive', '_cleanup_archive', '_cleanup_reports', '_repo_hygiene_archive', 'audit']);

function walk(dkd_path, dkd_accumulator = []) {
  if (!fs.existsSync(dkd_path)) return dkd_accumulator;
  const dkd_path_stat = fs.statSync(dkd_path);
  if (dkd_path_stat.isFile()) {
    if (exts.has(path.extname(dkd_path))) dkd_accumulator.push(dkd_path);
    return dkd_accumulator;
  }
  const dkd_base_name = path.basename(dkd_path);
  if (ignoreParts.has(dkd_base_name)) return dkd_accumulator;
  for (const dkd_entry_name of fs.readdirSync(dkd_path)) {
    walk(path.join(dkd_path, dkd_entry_name), dkd_accumulator);
  }
  return dkd_accumulator;
}

const files = [];
for (const target of targets) walk(target, files);
files.sort();

const largeFiles = [];
const consoleHits = [];
const todoHits = [];
const importCounts = [];

for (const file of files) {
  const rel = path.relative(repo, file);
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const loc = lines.length;
  importCounts.push({ file: rel, imports: (text.match(/^import\s/mg) || []).length, loc });
  if (loc >= 250) largeFiles.push({ file: rel, loc });

  lines.forEach((line, idx) => {
    if (/console\.(log|warn|error)/.test(line)) {
      consoleHits.push(`${rel}:${idx + 1}: ${line.trim()}`);
    }
    if (/TODO|FIXME/.test(line)) {
      todoHits.push(`${rel}:${idx + 1}: ${line.trim()}`);
    }
  });
}

largeFiles.sort((dkd_left_item, dkd_right_item) => dkd_right_item.loc - dkd_left_item.loc);
importCounts.sort((dkd_left_item, dkd_right_item) => dkd_right_item.imports - dkd_left_item.imports || dkd_right_item.loc - dkd_left_item.loc);

const summary = [];
summary.push(`# Phase 29 Runtime Hygiene Summary`);
summary.push(``);
summary.push(`Generated: ${new Date().toISOString()}`);
summary.push(`JS/TS files scanned: ${files.length}`);
summary.push(`Large files (>=250 LOC): ${largeFiles.length}`);
summary.push(`console hits: ${consoleHits.length}`);
summary.push(`TODO/FIXME hits: ${todoHits.length}`);
summary.push(``);
summary.push(`## Largest files`);
for (const row of largeFiles.slice(0, 20)) summary.push(`- ${row.file} — ${row.loc} LOC`);
summary.push(``);
summary.push(`## Highest import-count files`);
for (const row of importCounts.slice(0, 20)) summary.push(`- ${row.file} — ${row.imports} imports, ${row.loc} LOC`);
summary.push(``);
summary.push(`## Notes`);
summary.push(`- Bu rapor runtime dosyalarını değiştirmez.`);
summary.push(`- console/TODO taraması sonraki kontrollü temizlik için işaret bırakır.`);

fs.writeFileSync(path.join(outDir, 'phase29_runtime_hygiene_summary.md'), summary.join('\n'));
fs.writeFileSync(path.join(outDir, 'large_runtime_files.txt'), largeFiles.map((dkd_row) => `${dkd_row.file}|${dkd_row.loc}`).join('\n') + '\n');
fs.writeFileSync(path.join(outDir, 'console_hits.txt'), consoleHits.join('\n') + (consoleHits.length ? '\n' : ''));
fs.writeFileSync(path.join(outDir, 'todo_fixme_hits.txt'), todoHits.join('\n') + (todoHits.length ? '\n' : ''));
fs.writeFileSync(path.join(outDir, 'import_density.txt'), importCounts.map((dkd_row) => `${dkd_row.file}|imports=${dkd_row.imports}|loc=${dkd_row.loc}`).join('\n') + '\n');
