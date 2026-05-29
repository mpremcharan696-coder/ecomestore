// Automated API Test Script for VendorVerse Backend
// Run with: node test_api.js

const BASE_URL = 'http://localhost:5000';
const TEST_STORE_ID = 1; // Adjust based on your actual store ID

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

let passCount = 0;
let failCount = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passCount++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    failCount++;
  }
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function runTests() {
  console.log(`\n${colors.blue}=== VendorVerse API Test Suite ===${colors.reset}\n`);
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Store ID: ${TEST_STORE_ID}\n`);

  // Products API
  console.log(`${colors.yellow}--- Products API ---${colors.reset}`);
  await test('GET /api/products', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/products?storeId=${TEST_STORE_ID}`);
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  await test('GET /api/stores', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/stores`);
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  // Transactions API
  console.log(`\n${colors.yellow}--- Transactions API ---${colors.reset}`);
  await test('GET /api/transactions', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/transactions?storeId=${TEST_STORE_ID}`);
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  // Profit & Loss API
  console.log(`\n${colors.yellow}--- Profit & Loss API ---${colors.reset}`);
  await test('GET /api/profit-loss/:storeId', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/profit-loss/${TEST_STORE_ID}`);
    if (typeof data.totalRevenue !== 'number') throw new Error('Missing totalRevenue');
    if (typeof data.totalCost !== 'number') throw new Error('Missing totalCost');
    if (typeof data.netProfit !== 'number') throw new Error('Missing netProfit');
    if (typeof data.profitMargin !== 'number') throw new Error('Missing profitMargin');
  });

  await test('GET /api/profit-loss/:storeId/products (NEW)', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/profit-loss/${TEST_STORE_ID}/products`);
    if (!Array.isArray(data)) throw new Error('Expected array');
    if (data.length > 0) {
      const product = data[0];
      if (typeof product.unit_price !== 'number') throw new Error('Missing unit_price');
      if (typeof product.cost_price !== 'number') throw new Error('Missing cost_price');
      if (typeof product.profit_per_unit !== 'number') throw new Error('Missing profit_per_unit');
      if (typeof product.margin_per_unit !== 'number') throw new Error('Missing margin_per_unit');
    }
  });

  // Sales Reports API
  console.log(`\n${colors.yellow}--- Sales Reports API ---${colors.reset}`);
  await test('GET /api/sales-reports/dynamic (weekly)', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/sales-reports/dynamic/${TEST_STORE_ID}?range=weekly`);
    if (!Array.isArray(data.labels)) throw new Error('Missing labels');
    if (!Array.isArray(data.revenueData)) throw new Error('Missing revenueData');
    if (!Array.isArray(data.ordersData)) throw new Error('Missing ordersData');
  });

  await test('GET /api/sales-reports/dynamic (monthly)', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/sales-reports/dynamic/${TEST_STORE_ID}?range=monthly`);
    if (!Array.isArray(data.labels)) throw new Error('Missing labels');
  });

  await test('GET /api/sales-reports/dynamic (yearly)', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/sales-reports/dynamic/${TEST_STORE_ID}?range=yearly`);
    if (!Array.isArray(data.labels)) throw new Error('Missing labels');
  });

  // Distributor API
  console.log(`\n${colors.yellow}--- Distributor API ---${colors.reset}`);
  await test('GET /api/distributor-orders', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/distributor-orders?storeId=${TEST_STORE_ID}`);
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  // Invoices API
  console.log(`\n${colors.yellow}--- Invoices API ---${colors.reset}`);
  await test('GET /api/invoices', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/invoices?storeId=${TEST_STORE_ID}`);
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  // Deliveries API
  console.log(`\n${colors.yellow}--- Deliveries API ---${colors.reset}`);
  await test('GET /api/deliveries', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/deliveries?storeId=${TEST_STORE_ID}`);
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  // Auctions API
  console.log(`\n${colors.yellow}--- Auctions API ---${colors.reset}`);
  await test('GET /api/auctions', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/auctions`);
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  // Chatbot API (NEW - Gemini Integration)
  console.log(`\n${colors.yellow}--- Chatbot API (Gemini) ---${colors.reset}`);
  await test('GET /api/chatbot-sessions', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/chatbot-sessions?storeId=${TEST_STORE_ID}`);
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  await test('POST /api/chat (Gemini endpoint)', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: TEST_STORE_ID,
        storeName: 'Test Store',
        userMessage: 'What is my current inventory status?',
        chatHistory: []
      })
    });
    if (typeof data.reply !== 'string') throw new Error('Missing reply');
    if (data.reply.length === 0) throw new Error('Empty reply');
  });

  // Telegram API
  console.log(`\n${colors.yellow}--- Telegram API ---${colors.reset}`);
  await test('GET /api/telegram-customers', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/telegram-customers?storeId=${TEST_STORE_ID}`);
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  await test('GET /api/telegram-communities', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/telegram-communities?storeId=${TEST_STORE_ID}`);
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  // Payment Transactions API
  console.log(`\n${colors.yellow}--- Payment Transactions API ---${colors.reset}`);
  await test('GET /api/payment-transactions', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/payment-transactions?storeId=${TEST_STORE_ID}`);
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  // AI Restocking Notifications
  console.log(`\n${colors.yellow}--- AI Notifications API ---${colors.reset}`);
  await test('GET /api/ai-restocking-notifications', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/ai-restocking-notifications?storeId=${TEST_STORE_ID}`);
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  // Summary
  console.log(`\n${colors.blue}=== Test Summary ===${colors.reset}`);
  console.log(`${colors.green}Passed: ${passCount}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failCount}${colors.reset}`);
  console.log(`Total: ${passCount + failCount}\n`);

  if (failCount === 0) {
    console.log(`${colors.green}🎉 All tests passed!${colors.reset}\n`);
  } else {
    console.log(`${colors.red}⚠️  Some tests failed. Check the output above.${colors.reset}\n`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
  process.exit(1);
});
