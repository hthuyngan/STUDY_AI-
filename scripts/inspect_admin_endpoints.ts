import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/endpoints_inventory.json', 'utf8'));
const adminRoutes = data.routes.filter((r: any) => r.file === 'AdminController.cs');

console.log(`AdminController endpoints count: ${adminRoutes.length}`);
console.table(adminRoutes.map((r: any) => ({ verb: r.verb, path: r.path })));
