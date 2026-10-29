import { build, context } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const watch = process.argv.includes('--watch');
await mkdir('dist', { recursive: true });
const code = { entryPoints: ['src/code.ts'], outfile: 'dist/code.js', bundle: true, target: 'es2017' };
const ui = { entryPoints: ['src/ui.ts'], bundle: true, write: false, target: 'es2020' };
async function buildUI() {
 const result = await build(ui);
 const html = await readFile('src/ui.html', 'utf8');
 await writeFile('dist/ui.html', html.replace('/*__UI_SCRIPT__*/', result.outputFiles[0].text.replaceAll('</script', '<\\/script')));
}
if (watch) {
 const ctx = await context(code); await ctx.watch(); await buildUI();
 const { watch: watchFiles } = await import('node:fs');
 let timer; watchFiles('src', (_, file) => { if (file?.startsWith('ui') || file === 'model.ts') { clearTimeout(timer); timer = setTimeout(() => buildUI().catch(console.error), 100); } });
 console.log('Watching src. Re-run the plugin in Figma after a rebuild.');
} else { await build(code); await buildUI(); console.log('Built dist/code.js and dist/ui.html'); }
