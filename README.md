# AgroInventario Frontend

Frontend del sistema desarrollado con React + Vite.

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
npm install
```

## Variables de entorno

Crear o editar `.env` en la raíz del frontend:

```env
VITE_BACKEND_URI=http://localhost:8080

# Usuario admin para pruebas E2E
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=

# Usuario sin permisos admin para pruebas E2E de autorización
E2E_NOADMIN_EMAIL=
E2E_NOADMIN_PASSWORD=

# Configuración opcional de Playwright
E2E_BASE_URL=http://127.0.0.1:5173/inventario
E2E_WEB_SERVER_URL=http://127.0.0.1:5173/inventario
E2E_WEB_SERVER_COMMAND=npm run dev -- --host 127.0.0.1 --port 5173

# MailHog para capturar correo de verificación en E2E
E2E_MAILHOG_API_URL=http://localhost:8025

# Opcionales (si no usas MailHog)
E2E_VERIFICATION_LINK_PROVIDER_URL=
E2E_VERIFICATION_TOKEN_PROVIDER_URL=
E2E_VERIFICATION_TOKEN=
```

## Comandos disponibles

### Desarrollo y build

- `npm run dev`: inicia Vite en modo desarrollo.
- `npm run build`: genera build de producción en `dist/`.
- `npm run preview`: levanta el build generado para validarlo localmente.
- `npm run start`: sirve `dist/` con `serve`.
- `npm run lint`: ejecuta ESLint sobre el proyecto.

### Documentación

- `npm run autodoc`: genera documentación automática con el script `docgen.mjs`.
- `npm run docs`: genera documentación JSDoc usando `jsdoc.json`.

### Pruebas E2E (Playwright)

- `npm run test:e2e`: ejecuta toda la suite E2E en modo headless.
- `npm run test:e2e:onboarding`: ejecuta solo flujo y validaciones de onboarding/autorregistro.
- `npm run test:e2e:ui`: abre Playwright UI para ejecutar y depurar pruebas visualmente.
- `npm run test:e2e:headed`: ejecuta E2E mostrando el navegador.
- `npm run test:e2e:debug`: ejecuta E2E en modo debug paso a paso.

### MailHog (solo frontend E2E)

- `npm run mailhog:start`: levanta MailHog por Docker.
- `npm run mailhog:stop`: detiene MailHog.
- `npm run mailhog:logs`: revisa logs de MailHog.

Flujo recomendado:

1. `npm run mailhog:start`
2. `npm run test:e2e:onboarding`
3. `npm run mailhog:stop`

## Notas importantes

- Las pruebas crean y modifican datos reales, por lo que se recomienda usar un entorno de QA.
- No subas credenciales reales al repositorio; usa `.env` local y rota claves si ya fueron expuestas.
