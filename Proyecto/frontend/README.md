# Frontend — Semi-Social

React 19 + Vite + TypeScript con CSS Modules. Base a cargo de R5. Usa la misma organización por
dominios que los backends: `src/<dominio>/` contiene todo lo de esa funcionalidad (pantallas, cliente
de su API y estilos).

```
src/
├── app/          arranque, rutas, sesión y layouts (encabezado, pestañas del móvil)
├── shared/
│   ├── api/      cliente HTTP hacia el ALB: token, errores y URLs (API, imágenes, WebSocket)
│   ├── lib/      utilidades: useForm, useResource, validaciones, fechas
│   └── ui/       sistema de diseño de la Práctica 2 en diseño atómico + tema claro/oscuro
├── imagenes/     subida a API Gateway (compresión incluida); la usan registro, perfil y publicaciones
├── identidad/ perfil/ publicaciones/ comentarios/ traduccion/
├── amistades/ chat/ chatbot/          un dominio por carpeta
```

## Variables de entorno

Copiar [`.env.example`](.env.example) como `.env`:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `http://localhost:3000` en desarrollo; el DNS del ALB desde el domingo |
| `VITE_IMAGENES_API_URL` | Endpoint completo de la API de imágenes ([dominios/imagenes](../dominios/imagenes/README.md)) |

## Comandos

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # dist/
aws s3 sync dist/ s3://proyecto-web-g8 --delete   # con la llave de S3
```

## Cómo agregar un dominio

1. **Llamadas al backend:** `request(api('/ruta'), { method, body: JSON.stringify(...) })` desde
   `@/shared/api`. Agrega el token solo y lanza `ApiError` con el mensaje de `{"error"}`. Un `401`
   cierra la sesión.
2. **Pantalla:** se registra en [`app/AppRoutes.tsx`](src/app/AppRoutes.tsx), dentro de la ruta
   privada, y su ruta va en [`app/paths.ts`](src/app/paths.ts).
3. **Menú:** una línea en [`app/navigation.ts`](src/app/navigation.ts) la muestra en la barra de
   escritorio y en las pestañas del móvil.
4. **Componentes:** `@/shared/ui/atoms`, `molecules` y `organisms` (botones, campos, avatar,
   diálogo, alertas, estados vacíos y de carga). Los colores y espacios son tokens `--tf-*`.
5. **Imágenes:** `subirImagen('Fotos_Perfil' | 'Fotos_Publicadas', file)` desde `@/imagenes`
   devuelve `{ key, url }`. Ya comprime a JPEG y valida el tipo.
6. **Chat:** `WS_URL` de `@/shared/api` es el mismo ALB con `ws://`.

## Sesión

La sesión guarda solo el token. Identidad lo entrega con `useSession().iniciarSesion(token)` al
terminar el login (contraseña o facial); un `401` del backend la cierra. Los datos del usuario los
trae [perfil](../dominios/perfil/README.md) con `usePerfil()`.

## Contratos

Cada dominio llama a su API desde un único archivo `src/<dominio>/<dominio>.api.ts`. Perfil,
comentarios y traducción siguen la sección 3 de su README. **Identidad, amistades, chat y chatbot
tienen el contrato propuesto escrito al inicio de ese archivo**, porque su sección 3 aún está vacía:
si el backend define otra ruta o forma, solo se ajusta ese archivo.
