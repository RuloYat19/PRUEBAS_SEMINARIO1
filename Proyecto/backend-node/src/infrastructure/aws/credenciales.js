export function credencialesDe(servicio, env = process.env) {
  const accessKeyId = env[`${servicio}_ACCESS_KEY_ID`];
  const secretAccessKey = env[`${servicio}_SECRET_ACCESS_KEY`];
  return accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
}
