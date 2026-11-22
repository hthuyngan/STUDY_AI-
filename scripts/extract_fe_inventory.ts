import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const feFiles = walkDir('frontend/src');
const largeFiles: any[] = [];
const services: any[] = [];

feFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n').length;
  const relPath = path.relative('frontend/src', f).replace(/\\/g, '/');
  if (lines > 300) {
    largeFiles.push({ file: relPath, lines });
  }
  if (relPath.includes('service') || relPath.includes('api')) {
    services.push({ file: relPath, lines });
  }
});

largeFiles.sort((a, b) => b.lines - a.lines);
services.sort((a, b) => b.lines - a.lines);

console.log(`Frontend total TS/TSX files: ${feFiles.length}`);
console.log(`Frontend files > 300 lines: ${largeFiles.length}`);
console.log('Top large files:');
console.table(largeFiles.slice(0, 15));
console.log('Top services:');
console.table(services.slice(0, 15));

fs.writeFileSync('scripts/fe_inventory.json', JSON.stringify({ largeFiles, services }, null, 2));
