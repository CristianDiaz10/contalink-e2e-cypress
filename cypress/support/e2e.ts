// cypress/support/e2e.ts
// ====================================================================
// 📄 Archivo: cypress/support/e2e.ts
// --------------------------------------------------------------------
// Este archivo se ejecuta AUTOMÁTICAMENTE antes de correr cualquier test E2E.
//
// Aquí es donde se inicializan cosas globales:
//   ✅ Imports de comandos personalizados
//   ✅ Plugins o librerías que deben cargarse antes de los tests
//   ✅ Hooks o configuración general (si se necesita)
//
// 🚀 En este proyecto:
//   - Se cargan los comandos custom definidos en `commands.ts`
//   - Se habilita el soporte para usar selectores XPath en Cypress
// ====================================================================


// --------------------------------------------------------------------
// 1️⃣ Importo mis comandos personalizados
// --------------------------------------------------------------------
// Esto hace que Cypress cargue los comandos que definí en:
//   cypress/support/commands.ts
// Así ya puedo usar comandos como:
//
//   cy.byRoleButton("Guardar")
//   cy.byRoleButton(/Enviar/i)
//
// en cualquier test, sin necesidad de importar nada más.
import "./commands";


// --------------------------------------------------------------------
// 2️⃣ Importo el plugin cypress-xpath
// --------------------------------------------------------------------
// Esto habilita el uso de `cy.xpath()` en todo el proyecto.
// Muy útil cuando el HTML de la app no tiene buenos IDs o data-testid.
//
// Ejemplo de uso:
//   cy.xpath('//button[text()="Eliminar"]').click()
//
// 👉 Recuerda que XPath es sensible a los cambios del DOM, úsalo
//    solo cuando no haya selectores más estables.
import "cypress-xpath";