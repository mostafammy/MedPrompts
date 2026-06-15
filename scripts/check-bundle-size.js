const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MAX_JS_GZIP = 80000;
const MAX_CSS_GZIP = 20000;

function getGzipSize(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return zlib.gzipSync(fileBuffer).length;
}

function findFilesInDir(startPath, filter, results = []) {
  if (!fs.existsSync(startPath)) {
    return results;
  }
  const files = fs.readdirSync(startPath);
  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      findFilesInDir(filename, filter, results);
    } else if (filename.endsWith(filter)) {
      results.push(filename);
    }
  }
  return results;
}

const nextStaticDir = path.join(process.cwd(), '.next', 'static');

if (!fs.existsSync(nextStaticDir)) {
  console.log('Skipping bundle size check: .next/static not found.');
  process.exit(0);
}

const jsFiles = findFilesInDir(nextStaticDir, '.js');
const cssFiles = findFilesInDir(nextStaticDir, '.css');

let totalJsGzip = 0;
for (const file of jsFiles) {
  totalJsGzip += getGzipSize(file);
}

let totalCssGzip = 0;
for (const file of cssFiles) {
  totalCssGzip += getGzipSize(file);
}

console.log(`Total JS Gzip Size: ${totalJsGzip} bytes`);
console.log(`Total CSS Gzip Size: ${totalCssGzip} bytes`);

let failed = false;

if (totalJsGzip > MAX_JS_GZIP) {
  console.error(`❌ JS bundle size exceeds maximum allowed limit (${MAX_JS_GZIP} bytes)`);
  failed = true;
}

if (totalCssGzip > MAX_CSS_GZIP) {
  console.error(`❌ CSS bundle size exceeds maximum allowed limit (${MAX_CSS_GZIP} bytes)`);
  failed = true;
}

if (failed) {
  process.exit(1);
} else {
  console.log('✅ Bundle sizes are within limits.');
}
