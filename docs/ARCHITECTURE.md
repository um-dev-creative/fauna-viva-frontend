# fauna-viva-frontend — arquitectura

Portal Angular 22 y BFF Express 5 en un solo repositorio y una sola imagen Docker. El backend es `fauna-viva-rest`.
Sigue la estructura de `zerobound-frontend` y de `stratum`.

## Piezas

| Pieza | Tecnología | Dónde |
| --- | --- | --- |
| Portal | Angular 22, TypeScript 6, componentes standalone, señales, Tailwind CSS 4, `@ngx-translate` (es-VE) | `src/` |
| BFF | Node 24, Express 5, JavaScript CommonJS (`'use strict'`) | `server.js`, `server/` |
| Imagen | `node:24-alpine` en dos etapas, usuario `node`, `HEALTHCHECK` | `Dockerfile` |

```mermaid
flowchart LR
    B["Navegador"] -- "HTTPS" --> N["nginx"]
    N --> BFF["BFF Express :7006<br/>sirve el portal + /api"]
    BFF -- "session-token" --> API["fauna-viva-rest"]
    BFF -. "sesión (B-01)" .-> BB["Backbone"]
```

## BFF

- `server.js` lee la configuración, ejecuta `settingsProblems()` y **termina con código 78** si falta algo obligatorio; luego arranca HTTP, o HTTPS si hay `SSL_CERT_PATH` y `SSL_KEY_PATH`.
- `server/app.js` exporta `createApp({ distPath })`: compresión, CORS solo para `CORS_ORIGIN` con credenciales, JSON de hasta 2 MB, límite de tasa por IP, traza W3C, `GET /health`, exigencia de la cabecera `x-fv-csrf: 1` en llamadas de escritura a `/api`, `404` JSON para `/api` desconocido y el build de Angular (con `index.html` para rutas del cliente). Sin build responde `503`.
- `server/config/constants.js` concentra las variables de entorno; `settings-check.js` decide si el BFF puede arrancar; `logger.js` usa winston.
- `server/shared/csrf.js` y `trace.js` (contexto de traza W3C, `X-Trace-Id`). `healthcheck.js` es la sonda del contenedor.
- `server/shared/backbone.js`, `session.js`, `cookies.js`, `proxy.js` y `server/routes/auth.routes.js`: la sesión (ver «Seguridad»).
- `trust proxy` solo se acepta como número de saltos o direcciones. `TRUST_PROXY=true` se rechaza porque dejaría elegir la IP al cliente.

Lo que cada tarea siguiente añade: B-02 proxy al backend con renovación silenciosa, B-03 estructura del portal por rol y selector de clínica.

## Seguridad

El navegador nunca ve un token: el BFF los guarda en cookies `httpOnly`, `SameSite=Lax` (`Secure` con `COOKIE_SECURE=true`) llamadas `fv_session` y `fv_refresh`, con la vida del refresh token. El portal solo recibe el perfil (`id`, `username`, `firstname`, `lastname`).

```mermaid
sequenceDiagram
    participant P as Portal
    participant F as BFF
    participant B as Backbone
    P->>F: POST /api/v1/auth/login {email, password} + x-fv-csrf
    F->>B: POST /managed-clients/token (solo si el token del cliente venció)
    B-->>F: accessToken del cliente de aplicación
    F->>B: POST /session/token {email, password, applicationId} + Bearer del cliente
    B-->>F: token + refreshToken
    F-->>P: 200 {user} + Set-Cookie fv_session, fv_refresh
    P->>F: GET /api/v1/auth/me (al iniciar)
    F-->>P: 200 {user} (renueva con el refresh si el token venció)
```

- **Cliente de aplicación**: el BFF se identifica ante Backbone con `BACKBONE_CLIENT_ID/SECRET`. Su token se guarda en memoria hasta un minuto antes de vencer y los inicios de sesión simultáneos comparten una sola petición. Si Backbone rechaza al cliente (token o permiso), el BFF responde `502` y registra un error de configuración: nunca se le atribuye al usuario.
- **Credenciales**: usuario inexistente, contraseña incorrecta y petición mal formada por Backbone responden el mismo `401 Invalid credentials`. Backbone `429` se traduce a `429`.
- **Límites**: `LOGIN_RATE_LIMIT_MAX` (10 cada 15 min por IP) en el login y `REGISTRATION_RATE_LIMIT_MAX` (20) en registro, verificación y reenvío; el undécimo intento recibe `429` con `Retry-After`.
- **Registro del apoderado**: `/auth/register`, `/auth/verify-email` y `/auth/resend-verification` reenvían solo los campos documentados (el navegador no puede elegir rol, aplicación ni `active`), sin cookies, con la IP del visitante en `X-Forwarded-For`.
- **Cierre de sesión**: `POST /auth/logout` revoca ambos tokens en Backbone y borra las cookies pase lo que pase.
- **Portal**: `AuthService.restore()` corre en `provideAppInitializer` (un `F5` no pide la clave de nuevo); `authGuard` protege `/` y `guestGuard` deja `/login` y `/registro` solo a visitantes; `authInterceptor` agrega `x-fv-csrf` a toda llamada a `/api/v1` y, ante un `401` que no venga del login ni de `/auth/me`, olvida la sesión y lleva al login.

## Portal

- `src/app/{core,shared,features}`; rutas cargadas de forma diferida; alias `@app`, `@core`, `@features`, `@env`.
- Textos en `public/i18n/es-VE.json`, cargados con `provideTranslateHttpLoader`. Idioma por defecto y de respaldo: `es-VE`.
- Estilos con Tailwind CSS 4; los colores de marca son tokens `--color-fv-*` en `src/styles.css` (la marca por clínica, P-08, los reemplaza).
- Las llamadas van a `/api/v1`; en desarrollo `proxy.conf.json` las envía al BFF.

## Calidad

| Qué | Cómo | Umbral |
| --- | --- | --- |
| BFF | `node:test` en `server/test/*.test.js`, `--experimental-test-coverage` | 85 % líneas, ramas y funciones (`pnpm test:bff:coverage`) |
| Portal | Karma + Jasmine + `karma-coverage` | 85 % sentencias, ramas, funciones y líneas (`pnpm test:coverage`) |
| Archivos sin prueba | `scripts/check-coverage-files.mjs` | falla si un `.ts` no aparece en el reporte |
| Todo junto | `pnpm test:all` y el workflow `ci.yml` | además compila producción y construye la imagen |

## Ejecutar

```bash
pnpm install
pnpm dev          # Angular en modo watch + BFF en :7006
pnpm test:all     # pruebas con umbrales
pnpm build && node server.js   # portal servido por el BFF en :7006
```

Variables: `.env.example`. Node 24 y pnpm 12 (versión fijada en `packageManager`).
