# fauna-viva-frontend

Portal Angular 22 y BFF Express 5 de **Fauna Viva**, el sistema de gestión de pacientes veterinarios. El backend vive en [`fauna-viva-rest`](https://github.com/um-dev-creative/fauna-viva-rest).

- Arquitectura: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Decisiones: [`docs/tecnica/adr/`](docs/tecnica/adr/)
- Cambios: [`CHANGELOG.md`](CHANGELOG.md)

## Requisitos
Node 24 y pnpm 12 (`packageManager` fija la versión).

## Uso rápido
```bash
cp .env.example .env
pnpm install
pnpm dev            # portal en modo watch + BFF en http://localhost:7006
pnpm test:all       # pruebas del BFF y del portal; falla por debajo de 85 %
pnpm build && node server.js
```

## Flujo de ramas
`main` (rama inicial) → `development` → `feature/<tarea>`. Todo desarrollo parte de `development` y entra por pull request. Una tarea con código solo se cierra con sus criterios de aceptación, documentación técnica y de usuario, y cobertura de funciones o métodos de al menos 85 %.
