# Estructura del portal (B-03)

## Rutas

```
/login, /registro            solo visitantes (guestGuard)
/                            ShellComponent  (authGuard + clinicsResolver)
  ├─ ''                      HomeComponent
  └─ /agenda, /pacientes, /urgencias, /historia, /examenes, /personal, /clinica
                             una ruta por sección del menú (roleGuard); hoy muestran «en construcción»
**                           NotFoundComponent
```

Las rutas de sección se generan desde `src/app/core/nav/nav.config.ts`. **Esa lista es la única fuente** de qué ve cada rol: el menú la lee para mostrar opciones y `roleGuard` la lee para rechazar la dirección escrita a mano. Lo que se oculta también se niega.

| Sección | Roles que la ven |
| --- | --- |
| agenda, pacientes | veterinario, técnico, recepción, administrador, apoderado |
| urgencias | veterinario, técnico, recepción, administrador |
| historia | veterinario, técnico, administrador (recepción no) |
| examenes | veterinario, técnico, administrador, apoderado |
| personal, clinica | administrador de clínica |

Cuando una tarea construya su pantalla (A-03, H-02, …), reemplaza el `loadComponent` de su ruta; el menú y la guarda no cambian.

Esto es solo comodidad y claridad: **la autorización real es del backend** (rol por clínica en `personas`, ADR 012, y RLS). Ocultar una opción no protege un dato.

## Clínica activa

`ClinicService` (`core/clinic`) pide `GET /api/v1/me/clinicas` (contrato de C-01: clínicas, sedes y roles de la persona) una vez por persona.

- Recuerda la clínica elegida por persona en `localStorage` (`fv.clinic.<id>`); si el almacenamiento falla o la clínica ya no existe, usa la primera.
- `select(id)` cambia la clínica y sube `version`. `ShellComponent` reconstruye el `router-outlet` cuando cambia `version`, así ninguna pantalla conserva datos de la clínica anterior.
- `clear()` se llama al cerrar sesión; otra persona nunca ve la lista de la anterior.
- Una cuenta sin clínicas ve un aviso en lugar del menú.

## Interceptores (`core/http`, en este orden)

1. `authInterceptor`: cabecera `x-fv-csrf: 1` y `401` → olvida la sesión y va al login (salvo `/auth/login` y `/auth/me`).
2. `clinicInterceptor`: `X-Clinic-Id` con la clínica activa en toda llamada a `/api/v1`, excepto `/auth/*` y `/me/clinicas`.
3. `errorInterceptor`: avisa en lenguaje claro de `403`, `412`, `429`, `5xx` y falta de conexión, usando el `detail` de un `problem+json` cuando existe. El error sigue llegando a quien llamó; los `401`, `4xx` de validación y las rutas `/auth/*` los maneja cada pantalla.

Los avisos salen en `NotificationService` y se muestran en una región `role="status"` del shell (se cierran solos a los 8 s o con el botón).

## Formato

`core/format`: fechas y horas en **America/Caracas** y locale `es-VE`; dinero en **USD** (`$1.234,50`) y **VES** (`Bs. 1.234,50`). Pipes `fvDate`, `fvDateTime` y `fvMoney`.

## Diseño responsivo y accesibilidad

- Tailwind CSS 4. Todo control interactivo mide al menos 44 px (`min-h-11`).
- Desde 768 px el menú se muestra completo; por debajo aparece el botón «Menú» (`aria-expanded`, `aria-controls`) que lo abre y se cierra al elegir una opción. Verificado a 1024, 768 y 390 px: sin scroll horizontal.
- Enlace «Saltar al contenido», `nav` con `aria-label`, mensajes de error en `role="alert"`.
- Las pruebas del shell ejecutan **axe-core** y exigen cero violaciones (la regla `region` se omite porque la prueba monta solo un fragmento de página).

## Pruebas

Karma + Jasmine; cada pieza tiene su `*.spec.ts` (servicio de clínicas, guardas, resolver, interceptores, formatos, shell, rutas). Umbral global 85 %, y `scripts/check-coverage-files.mjs` falla si un archivo no aparece en el reporte.
