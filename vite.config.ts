import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile(), stripModuleAttr()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 4000,
    cssCodeSplit: false,
    reportCompressedSize: false,
    // classic script (not ESM) so the single file also works over file://
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
});

/**
 * The bundle is IIFE, but Vite keeps type="module" on the script tag.
 * Module scripts are unreliable over file:// — strip the attribute after inlining.
 */
function stripModuleAttr(): Plugin {
  return {
    name: 'strip-module-attr',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html;
      },
    },
    writeBundle() {
      const file = resolve(__dirname, 'dist', 'index.html');
      if (!existsSync(file)) return;
      let html = readFileSync(file, 'utf8');
      // classic script must run after #root exists → drop module attr + move to end of body
      html = html.replace(/<script type="module"( crossorigin)?>/g, '<script>');
      const start = html.indexOf('<script>');
      const end = html.indexOf('</script>', start);
      if (start !== -1 && end !== -1 && end > start) {
        const block = html.slice(start, end + '</script>'.length);
        html = html.slice(0, start) + html.slice(end + '</script>'.length);
        // insert before the LAST </body> (React bundles contain the literal "</body>" inside strings)
        const ins = html.lastIndexOf('</body>');
        if (ins !== -1) html = html.slice(0, ins) + block + html.slice(ins);
      }
      writeFileSync(file, html);
    },
  };
}
