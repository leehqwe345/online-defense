// Test process only: supply a local Google JWKS response, preserving actual signature verification.
const originalFetch=globalThis.fetch;
globalThis.fetch=(url,options)=>String(url)==='https://www.googleapis.com/oauth2/v3/certs'?Promise.resolve(new Response(JSON.stringify({keys:[JSON.parse(process.env.TEST_GOOGLE_JWK)]}),{status:200})):originalFetch(url,options);
