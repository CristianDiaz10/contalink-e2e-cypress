# Contalink E2E — Cypress + Cucumber + TypeScript + **POM**

Este set usa Page Object Model para separar lógica de UI en `cypress/pages/*`.

## Casos automatizados
- Acceso válido / inválido
- Logout
- Facturas: crear, buscar (incluir eliminadas y por número) y eliminar

## Ejecutar
```bash
npm ci
ACCESS_CODE='UXTY789@!!1' npm run cy:open
# headless
ACCESS_CODE='UXTY789@!!1' npm test
```

## Page Objects
- `login.page.ts`: login/logout + asserts
- `facturas.page.ts`: navegación y acciones de facturas
- `dashboard.page.ts`: verificación de carga básica

## Variables (env)
- `ACCESS_CODE`, `BASE_URL`
- `INVOICE_NUMBER` (default: FACTURA-CRIS), `INVOICE_TOTAL` (100), `INVOICE_STATUS` (Vigente)