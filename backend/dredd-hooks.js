// Dredd Hooks for OpenAPI contract testing
// - Logs in once and sets Cookie header for subsequent requests
// - Skips non-idempotent requests (POST/PUT/PATCH/DELETE) by default

const hooks = require('hooks')

let cookieHeader = ''

hooks.beforeAll(async (transactions, done) => {
  try {
    const loginRes = await fetch('http://127.0.0.1:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@epop.local', password: 'admin123' }),
      redirect: 'manual',
    })
    // Aggregate Set-Cookie headers
    const setCookies = loginRes.headers.raw()['set-cookie'] || []
    cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ')
  } catch (e) {
    console.error('Dredd login failed:', e)
  }
  done()
})

hooks.beforeEach((transaction, done) => {
  // Attach cookie to each request
  transaction.request.headers = transaction.request.headers || {}
  if (cookieHeader) {
    transaction.request.headers['Cookie'] = cookieHeader
  }

  // Skip mutating operations to keep contract tests safe/idempotent
  const method = String(transaction.request.method || 'GET').toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    transaction.skip = true
  }
  done()
})
