# ADR 004 — BFF en Express 5 y JavaScript, en el repositorio del portal

- **Estado:** aceptada (2026-10-20)
- **Decisión:** el BFF es una aplicación Express 5 en JavaScript (CommonJS) que vive en `fauna-viva-frontend` junto al portal Angular y se despliega en la misma imagen.
- **Contexto:** `stratum` y `zerobound-frontend` ya usan esa tecnología con el mismo patrón (`createApp()`, `settings-check`, cookies `httpOnly`, cabecera CSRF personalizada, proxy con renovación silenciosa). Mantener una sola forma de BFF reduce el costo de mantenimiento del equipo.
- **Consecuencias:** las cookies se llaman `fv_session` y `fv_refresh` y la cabecera CSRF `x-fv-csrf`. Las pruebas usan `node:test`. Se descartó NestJS por no coincidir con los repositorios de referencia.
- **Se revisa si:** el BFF crece hasta necesitar una estructura modular que Express sin framework no sostenga.
