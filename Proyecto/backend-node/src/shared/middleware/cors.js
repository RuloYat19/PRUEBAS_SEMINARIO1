export function createCorsMiddleware(origins) {
  const allowed = new Set(origins);
  return (request, response, next) => {
    const origin = request.get('origin');
    if (origin && allowed.has(origin)) {
      response.set('Access-Control-Allow-Origin', origin);
      response.set('Vary', 'Origin');
      response.set('Access-Control-Allow-Credentials', 'true');
    }
    response.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Authorization,Content-Type');
    if (request.method === 'OPTIONS') return response.sendStatus(204);
    next();
  };
}
