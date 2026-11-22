import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/endpoints_inventory.json', 'utf8'));
const routes: any[] = data.routes;

let md = `# STUDY_AI — Route & API Contract Map (Phase 0 Snapshot)

> Tài liệu này lưu trữ toàn bộ snapshot của 236 HTTP endpoints hiện tại trước khi thực hiện refactor.
> Bất kỳ thay đổi controller nào trong quá trình refactor đều **BẮT BUỘC** phải bảo toàn 100% các endpoint này về path, verb và behavior.

---

## Danh Sách Endpoints Hiện Tại (${routes.length} Endpoints)

| # | HTTP Verb | Route Path | Current Controller | Current File | Target Feature |
|---|---|---|---|---|---|
`;

routes.forEach((r, idx) => {
  let targetFeature = 'Shared';
  if (r.file.startsWith('Admin')) targetFeature = 'Features/Admin';
  else if (r.file.startsWith('Content')) targetFeature = 'Features/Content';
  else if (r.file.startsWith('Teacher') || r.file.startsWith('Classrooms') || r.file.startsWith('Assignments')) targetFeature = 'Features/Teacher';
  else if (r.file.startsWith('Curriculum') || r.file.startsWith('Practice') || r.file.startsWith('Me') || r.file.startsWith('Adaptive') || r.file.startsWith('Learning')) targetFeature = 'Features/Learner';
  else if (r.file.startsWith('Auth') || r.file.startsWith('Health')) targetFeature = 'Features/Public';
  else if (r.file.startsWith('Ai')) targetFeature = 'Features/AiTutor';

  md += `| ${idx + 1} | \`${r.verb}\` | \`${r.path}\` | \`${r.controller}\` | \`${r.file}\` | \`${targetFeature}\` |\n`;
});

fs.writeFileSync('docs/refactor/route-contract-map.md', md);
console.log('Generated docs/refactor/route-contract-map.md successfully');
