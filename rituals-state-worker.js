// Rituals state sync worker — Cloudflare Workers + KV
// Store cross-device state (menu ratings, day state) in a global KV store.
// Read: GET / with X-Api-Key header
// Write: PUT / with X-Api-Key header + JSON body { state?, menuRatings? }

addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

async function handle(request) {
  const key = request.headers.get('X-Api-Key');
  const expectedKey = RITUALS_API_KEY;
  if (key !== expectedKey) return new Response('Unauthorized', { status: 401 });
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders('text/plain') });
  if (request.method === 'GET') {
    const state = await RITUALS.get('state');
    const menuRatings = await RITUALS.get('menuRatings');
    return new Response(JSON.stringify({
      state: state ? JSON.parse(state) : null,
      menuRatings: menuRatings ? JSON.parse(menuRatings) : null
    }), { headers: corsHeaders('application/json') });
  }
  if (request.method === 'PUT') {
    const body = await request.json();
    if (body.state) await RITUALS.put('state', JSON.stringify(body.state));
    if (body.menuRatings) {
      const existing = await RITUALS.get('menuRatings');
      // If explicitly empty object, clear (admin reset); otherwise accumulate
      const merged = (existing && Object.keys(body.menuRatings).length > 0)
        ? mergeRatings(JSON.parse(existing), body.menuRatings) : body.menuRatings;
      await RITUALS.put('menuRatings', JSON.stringify(merged));
    }
    return new Response('OK', { headers: corsHeaders('text/plain') });
  }
  return new Response('Not Found', { status: 404, headers: corsHeaders('text/plain') });
}

function mergeRatings(existing, incoming) {
  const result = { ...existing };
  for (const [id, data] of Object.entries(incoming)) {
    if (result[id]) result[id] = { n: result[id].n + data.n, sum: result[id].sum + data.sum };
    else result[id] = data;
  }
  return result;
}

function corsHeaders(type) {
  return {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key'
  };
}