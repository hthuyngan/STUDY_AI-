const http = require('http');

http.get('http://localhost:8000/openapi/v1.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const doc = JSON.parse(data);
    let totalEndpoints = 0;
    const methods = {};
    const tags = {};
    const missingDesc = [];
    const missingResponses = [];
    const endpointsList = [];

    for (const [path, pathItem] of Object.entries(doc.paths || {})) {
      for (const [method, op] of Object.entries(pathItem)) {
        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;
        totalEndpoints++;
        const m = method.toUpperCase();
        methods[m] = (methods[m] || 0) + 1;
        const tag = (op.tags && op.tags[0]) || 'Untagged';
        tags[tag] = (tags[tag] || 0) + 1;

        const hasSummaryOrDesc = Boolean(op.summary || op.description);
        if (!hasSummaryOrDesc) {
          missingDesc.push({ method: m, path, tag });
        }

        const responses = Object.keys(op.responses || {});
        const hasSpecificCodes = responses.some(c => c !== '200' && c !== 'default');
        if (!hasSpecificCodes) {
          missingResponses.push({ method: m, path, tag, responses });
        }

        endpointsList.push({
          method: m,
          path,
          tag,
          summary: op.summary || '',
          hasBody: Boolean(op.requestBody),
          responses: responses.join(', ')
        });
      }
    }

    console.log(JSON.stringify({
      totalEndpoints,
      methods,
      tags,
      missingDescCount: missingDesc.length,
      missingDescSample: missingDesc.slice(0, 15),
      allMissingDesc: missingDesc,
      endpointsList
    }, null, 2));
  });
}).on('error', err => {
  console.error('Error fetching OpenAPI spec:', err.message);
});

