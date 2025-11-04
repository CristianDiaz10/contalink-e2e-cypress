# 🧩 Contalink E2E — Cypress + Cucumber + TypeScript + POM + k6 + GitHub Actions

Automatización de pruebas **E2E**, **API** y **Performance** para el sistema **Contalink**.

Incluye:
- ✅ **Cypress + Cucumber + TypeScript** (UI / API funcional)
- 🧱 **Page Object Model (POM)** para separar la lógica de UI
- ⚡ **k6** para pruebas de rendimiento
- 🤖 **GitHub Actions CI** para ejecutar todo automáticamente

---

## 🧭 Estructura del proyecto

```text
cypress/
 ├── e2e/
 │    ├── features/               # Escenarios en formato Gherkin
 │    ├── step_definitions/       # Pasos de Cucumber (common.ts, apis.ts)
 │    └── invoices.cy.ts          # Ejemplo de test API directo
 ├── pages/                       # Page Objects (POM)
 │    ├── login.page.ts
 │    ├── facturas.page.ts
 │    └── dashboard.page.ts
.github/
 └── workflows/
      └── cypress.yml             # Pipeline CI en GitHub Actions
k6-invoices.js                    # Script de performance (20 RPS / 30s)
cypress.config.ts                 # Configuración base de Cypress
README.md                         # Este archivo

# Clonar el repositorio
git clone https://github.com/tu_usuario/contalink-e2e-cypress.git
cd contalink-e2e-cypress

# Instalar dependencias
npm ci

Estas variables se leen desde Cypress.env() y son necesarias para ejecutar las pruebas.

Variable	Descripción	Ejemplo
BASE_URL	URL base de la app web	https://candidates-qa.contalink.com
API_BASE_URL	URL base de la API	https://candidates-api.contalink.com
ACCESS_CODE	Código de acceso para login	UXTY789@!!1
AUTH_TOKEN	Token de autorización para APIs	UXTY789@!!1
INVOICE_NUMBER	Número de factura de prueba	FACTURA-CRIS
INVOICE_TOTAL	Total de factura	100
INVOICE_STATUS	Estado de la factura	Vigente

🔹 Pruebas UI (Cypress + POM)

Login con código válido / inválido

Logout

Crear una factura nueva

Buscar factura (por número y con eliminadas)

Eliminar factura

🔹 Pruebas de API (Cucumber)

Endpoints:

GET /V1/invoices?page=1

GET /V1/invoices?page=1&invoice_number=FAC-7081986

POST /V1/invoices (factura válida y negativa)

PUT /V1/invoices/{id}

DELETE /V1/invoices/{id}

Validaciones:

Status esperado (200, 201, 422, 404)

Propiedades del body (invoice_number, status, active)

Error handling para casos negativos (total < 0 → 422)

Page Objects
Archivo	Descripción
login.page.ts	    Acceso, validaciones de error y logout
facturas.page.ts	Acciones CRUD sobre facturas
dashboard.page.ts	Validación general post-login

Ejecución local
npm test
# o
npx cypress run

Ejecutar solo pruebas API
npx cypress run --spec "cypress/e2e/step_definitions/apis.ts"

Pruebas de rendimiento (k6)
Script: k6-invoices.js
Ejecuta una carga constante de 20 solicitudes por segundo durante 30 segundos al endpoint:
GET https://candidates-api.contalink.com/V1/invoices?page=1&invoice_number=FAC-7081986
Ejecución local:
k6 run k6-invoices.js
Checks que valida:

    - status == 200

    - p(95) < 800ms (el 95% de respuestas tarda menos de 800 ms)

    - http_req_failed < 5%

- Integración continua (GitHub Actions)

El workflow cypress.yml se ejecuta automáticamente en cada push o PR a main/master:

Pasos:

Clona el repo (actions/checkout)

Instala Node.js y dependencias (npm ci)

Corre pruebas E2E con Cypress (cypress-io/github-action)

Instala k6

Ejecuta pruebas de performance

Sube artefactos (report.html, logs)