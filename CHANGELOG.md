# Changelog

## [Sin publicar]

### Añadido
- B-03: carcasa del portal con menú por rol y selector de clínica (recuerda la última elegida), guardas por rol, interceptores de `X-Clinic-Id` y de errores legibles (403, 412, 429, 5xx, sin conexión, `problem+json`), avisos, formatos America/Caracas y USD/VES, pruebas con axe-core. Guía de usuario «Moverse por el sistema y cambiar de clínica».
- B-02: proxy del BFF a `fauna-viva-rest` (`session-token` desde la cookie, `X-Clinic-Id`, `If-Match`, `Idempotency-Key`, `traceparent`; cabeceras de vuelta; parámetros repetidos sin índices; renovación silenciosa ante `401`; rechazo de rutas con `..`) y `helmet`.
- B-01: inicio y cierre de sesión con Backbone (cookies `fv_session`/`fv_refresh` httpOnly, cliente de aplicación con token compartido, límite de tasa en login y registro), registro y verificación de correo del apoderado, `GET /auth/me` con renovación; en el portal, pantallas de login y registro, `AuthService`, guardas de ruta e interceptor (CSRF y `401`). Guías de usuario «Iniciar y cerrar sesión» y «Crear mi cuenta».
- F0-05: esqueleto del portal Angular 22 y del BFF Express 5, con `GET /health`, verificación de configuración (código 78), cabecera CSRF, traza W3C, límite de tasa, Dockerfile, CI y pruebas con umbral de 85 %.

### Corregido
- `proxy.conf.json` apuntaba al puerto 7005; ahora 7006, el del BFF.
