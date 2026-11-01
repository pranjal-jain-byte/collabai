// Automated Integration Test for CollabAI Document REST API & CORS Contract

const assert = require('assert');

const BASE_URL = 'http://localhost:3000';
const ORIGIN = 'http://localhost:5173';

async function runTests() {
  console.log('--- Testing CollabAI REST API & CORS Contract ---');

  // Test 1: OPTIONS Preflight
  console.log('\n[Test 1] Testing CORS Preflight OPTIONS /api/documents...');
  const preflightRes = await fetch(`${BASE_URL}/api/documents`, {
    method: 'OPTIONS',
    headers: {
      'Origin': ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization',
    },
  });

  assert.strictEqual(preflightRes.status, 204, `Expected 204 No Content for preflight, got ${preflightRes.status}`);
  assert.strictEqual(preflightRes.headers.get('access-control-allow-origin'), ORIGIN, 'CORS allow-origin mismatch on preflight');
  assert.ok(preflightRes.headers.get('access-control-allow-methods').includes('POST'), 'CORS allow-methods missing POST');
  console.log('✓ Test 1 Passed: OPTIONS preflight returns 204 and valid CORS headers.');

  // Test 2: GET /api/documents
  console.log('\n[Test 2] Testing GET /api/documents...');
  const getDocsRes = await fetch(`${BASE_URL}/api/documents`, {
    headers: { 'Origin': ORIGIN },
  });
  assert.strictEqual(getDocsRes.status, 200, `Expected 200 OK, got ${getDocsRes.status}`);
  assert.strictEqual(getDocsRes.headers.get('access-control-allow-origin'), ORIGIN, 'CORS header missing on GET /api/documents');
  const getDocsData = await getDocsRes.json();
  assert.ok(Array.isArray(getDocsData.documents), 'Response must contain documents array');
  console.log(`✓ Test 2 Passed: Retrieved ${getDocsData.documents.length} persisted documents from database.`);

  // Test 3: POST /api/documents
  console.log('\n[Test 3] Testing POST /api/documents (Create Document)...');
  const uniqueTitle = `API Test Doc ${Date.now()}`;
  const testContent = 'Initial content from test runner';
  const createRes = await fetch(`${BASE_URL}/api/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': ORIGIN,
    },
    body: JSON.stringify({ title: uniqueTitle, content: testContent }),
  });

  assert.strictEqual(createRes.status, 201, `Expected 201 Created, got ${createRes.status}`);
  assert.strictEqual(createRes.headers.get('access-control-allow-origin'), ORIGIN, 'CORS header missing on POST /api/documents');
  const createData = await createRes.json();
  assert.ok(createData.docId, 'Created document must have docId');
  assert.strictEqual(createData.title, uniqueTitle, 'Title must match created title');
  const testDocId = createData.docId;
  console.log(`✓ Test 3 Passed: Successfully created document '${testDocId}' ("${uniqueTitle}").`);

  // Test 4: GET /api/documents/:docId
  console.log('\n[Test 4] Testing GET /api/documents/:docId...');
  const fetchDocRes = await fetch(`${BASE_URL}/api/documents/${testDocId}`, {
    headers: { 'Origin': ORIGIN },
  });
  assert.strictEqual(fetchDocRes.status, 200, `Expected 200 OK, got ${fetchDocRes.status}`);
  const fetchDocData = await fetchDocRes.json();
  assert.strictEqual(fetchDocData.docId, testDocId);
  assert.strictEqual(fetchDocData.title, uniqueTitle);
  assert.strictEqual(fetchDocData.content, testContent);
  console.log('✓ Test 4 Passed: Fetched document metadata and content accurately.');

  // Test 5: PATCH /api/documents/:docId/title
  console.log('\n[Test 5] Testing PATCH /api/documents/:docId/title...');
  const updatedTitle = `Renamed Test Doc ${Date.now()}`;
  const patchRes = await fetch(`${BASE_URL}/api/documents/${testDocId}/title`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Origin': ORIGIN,
    },
    body: JSON.stringify({ title: updatedTitle }),
  });
  assert.strictEqual(patchRes.status, 200, `Expected 200 OK, got ${patchRes.status}`);
  const patchData = await patchRes.json();
  assert.strictEqual(patchData.title, updatedTitle);
  console.log(`✓ Test 5 Passed: Successfully updated title to "${updatedTitle}".`);

  // Test 6: GET Non-existent Document -> 404
  console.log('\n[Test 6] Testing GET /api/documents/:nonExistentId (404 expected)...');
  const notFoundRes = await fetch(`${BASE_URL}/api/documents/non-existent-${Date.now()}`, {
    headers: { 'Origin': ORIGIN },
  });
  assert.strictEqual(notFoundRes.status, 404, `Expected 404 Not Found, got ${notFoundRes.status}`);
  console.log('✓ Test 6 Passed: Non-existent document returns 404.');

  // Test 7: DELETE /api/documents/:docId
  console.log('\n[Test 7] Testing DELETE /api/documents/:docId...');
  const deleteRes = await fetch(`${BASE_URL}/api/documents/${testDocId}`, {
    method: 'DELETE',
    headers: { 'Origin': ORIGIN },
  });
  assert.strictEqual(deleteRes.status, 200, `Expected 200 OK, got ${deleteRes.status}`);
  const verifyDeleteRes = await fetch(`${BASE_URL}/api/documents/${testDocId}`, {
    headers: { 'Origin': ORIGIN },
  });
  assert.strictEqual(verifyDeleteRes.status, 404, `Expected 404 after deletion, got ${verifyDeleteRes.status}`);
  console.log('✓ Test 7 Passed: Successfully deleted document and confirmed 404 on subsequent lookup.');

  console.log('\n>>> ALL 7 REST & CORS INTEGRATION TESTS PASSED SUCCESSFULLY! <<<\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
