import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { brotliCompressSync, constants as zlibConstants, gzipSync } from "node:zlib";
import tailwindcss from "@tailwindcss/vite";
import { minify } from "html-minifier-terser";
import { defineConfig } from "vite";

// Text files worth precompressing. Images are already compressed formats.
const COMPRESSIBLE = /\.(html|css|js|mjs|json|svg|txt|xml|webmanifest)$/;
const MIN_COMPRESS_BYTES = 1024;

// Minify index.html at build time. Vite minifies CSS and JS, not HTML.
function minifyHtml() {
  return {
    name: "minify-html",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler: (html) =>
        minify(html, {
          collapseWhitespace: true,
          conservativeCollapse: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          minifyCSS: true,
          minifyJS: true,
        }),
    },
  };
}

// Write .gz and .br next to every text asset, so nginx (gzip_static / brotli_static),
// Caddy (precompressed) or a CDN can serve them without compressing on each request.
function precompress() {
  let outDir;
  return {
    name: "precompress",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const files = await listFiles(outDir);
      for (const file of files) {
        if (!COMPRESSIBLE.test(file)) continue;
        const content = await readFile(file);
        if (content.length < MIN_COMPRESS_BYTES) continue;
        await writeFile(`${file}.gz`, gzipSync(content, { level: 9 }));
        await writeFile(
          `${file}.br`,
          brotliCompressSync(content, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 } }),
        );
      }
    },
  };
}

async function listFiles(directory) {
  const entries = await readdir(directory);
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry);
      return (await stat(path)).isDirectory() ? listFiles(path) : [path];
    }),
  );
  return nested.flat();
}

export default defineConfig({
  plugins: [tailwindcss(), minifyHtml(), precompress()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Inline only tiny assets; the logo stays a cacheable file.
    assetsInlineLimit: 2048,
    // Build output is served as-is; no source maps in production.
    sourcemap: false,
  },
});
