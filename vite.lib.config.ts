import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * Build NPM (lib mode). Usage : npm run build:lib
 *
 * Produit dans dist/ :
 *   multiselect.es.js    — ESM  (import { MultiSelect } from '@synapxlab/multiselect')
 *   multiselect.umd.cjs  — UMD  (require / <script> → window.SynapxMultiSelect)
 *   style.css            — CSS compilé, exporté sous '@synapxlab/multiselect/style'
 *   *.d.ts               — types générés par tsc (tsconfig.build.json)
 *
 * Vite ne minifie pas les espaces du format ES en mode lib (il préserve les
 * annotations de tree-shaking) : le script build:lib repasse esbuild dessus.
 */
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SynapxMultiSelect',
      formats: ['es', 'umd'],
      fileName: (format) => (format === 'umd' ? 'multiselect.umd.cjs' : 'multiselect.es.js'),
      cssFileName: 'style',
    },
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    cssCodeSplit: false,
    emptyOutDir: true,
  },
});
