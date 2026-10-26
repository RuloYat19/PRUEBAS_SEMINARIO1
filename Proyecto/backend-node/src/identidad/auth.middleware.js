export function createTokenAuthenticator({ cognito, repository }) {
  async function authenticateToken(token) {
    if (!token) return null;
    let user;
    try {
      user = await cognito.obtenerUsuario(token);
    } catch (error) {
      if (['NotAuthorizedException', 'InvalidParameterException'].includes(error.name)) return null;
      throw error;
    }
    const sub = user.UserAttributes?.find(({ Name }) => Name === 'sub')?.Value;
    if (!sub) return null;
    return repository.buscarPorCognitoSub(sub);
  }

  async function requireAuth(request, response, next) {
    const header = request.get('authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    const token = match?.[1]?.trim();
    if (!token) return response.status(401).json({ error: 'No autenticado' });
    try {
      const usuario = await authenticateToken(token);
      if (!usuario) return response.status(401).json({ error: 'No autenticado' });
      request.usuario = usuario;
      return next();
    } catch (error) {
      return next(error);
    }
  }

  return Object.assign(requireAuth, { authenticateToken });
}
