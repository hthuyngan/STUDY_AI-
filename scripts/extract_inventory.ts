import * as fs from 'fs';
import * as path from 'path';

const dir = 'backend/src/StudyAI.Api/Controllers';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.cs'));

interface RouteInfo {
  controller: string;
  file: string;
  verb: string;
  path: string;
  lines: number;
  injectsDbContext: boolean;
}

const routes: RouteInfo[] = [];
const controllerSummaries: any[] = [];

files.forEach(f => {
  const filePath = path.join(dir, f);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const injectsDbContext = content.includes('StudyAIDbContext');
  
  let currentRoutePrefix = '';
  let currentController = '';
  let controllerCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const routeMatch = line.match(/\[Route\("([^"]+)"\)\]/);
    if (routeMatch) {
      currentRoutePrefix = routeMatch[1];
    }
    const classMatch = line.match(/public\s+class\s+(\w+)\s*:\s*ControllerBase/);
    if (classMatch) {
      currentController = classMatch[1];
      controllerCount++;
    }
    const httpMatch = line.match(/\[(HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch)(\("([^"]*)"\))?\]/);
    if (httpMatch && currentController) {
      const verb = httpMatch[1].replace('Http', '').toUpperCase();
      const subPath = httpMatch[3] || '';
      let fullPath = currentRoutePrefix.replace('[controller]', currentController.replace('Controller', '').toLowerCase());
      if (subPath) {
        if (!fullPath.endsWith('/') && !subPath.startsWith('/')) fullPath += '/';
        fullPath += subPath;
      }
      routes.push({
        controller: currentController,
        file: f,
        verb,
        path: fullPath,
        lines: lines.length,
        injectsDbContext
      });
    }
  }

  controllerSummaries.push({
    file: f,
    lines: lines.length,
    injectsDbContext,
    endpointCount: routes.filter(r => r.file === f).length
  });
});

console.log(`Scanned ${files.length} controller files. Found ${routes.length} endpoints.`);
controllerSummaries.sort((a, b) => b.lines - a.lines);
console.table(controllerSummaries);

fs.writeFileSync('scripts/endpoints_inventory.json', JSON.stringify({ summaries: controllerSummaries, routes }, null, 2));
