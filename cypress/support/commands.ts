/// <reference types="cypress" />
// ====================================================================
// 📄 Archivo: cypress/support/commands.ts
// --------------------------------------------------------------------
// Este archivo sirve para definir comandos personalizados (custom commands)
// de Cypress que se pueden usar en cualquier test.
//
// La idea es tener funciones pequeñas y reutilizables, como “byRoleButton”,
// que hagan el código más legible y eviten duplicar selectores largos.
//
// ⚙️ Los Page Objects usan estos comandos para mantener un código limpio.
// ====================================================================


// -------------------------------------------------------------
// 🔘 Custom Command: byRoleButton(text)
// -------------------------------------------------------------
// Este comando busca cualquier botón (<button> o elemento con role="button">)
// que contenga cierto texto (literal o RegExp).
//
// Ejemplo de uso:
//   cy.byRoleButton("Guardar").click()
//   cy.byRoleButton(/Enviar/i).should("exist")
//
// Ventajas:
//   - Evita tener que escribir `cy.contains('button, [role="button"]', 'Guardar')`.
//   - Permite buscar tanto por texto exacto como por regex (mayúsculas/minúsculas).
// -------------------------------------------------------------
Cypress.Commands.add("byRoleButton", (text: string | RegExp) => {
  return cy.contains('button, [role="button"]', text);
});


// -------------------------------------------------------------
// 🧠 Extensión de tipos de Cypress
// -------------------------------------------------------------
// Esto le dice a TypeScript que ahora Cypress tiene un nuevo
// comando llamado "byRoleButton", para que:
//   - No marque error al usarlo en tests.
//   - Ofrezca autocompletado en VS Code.
//
// Sin esta declaración, TypeScript pensaría que “cy.byRoleButton” no existe.
// -------------------------------------------------------------
declare global {
  namespace Cypress {
    interface Chainable {
      // describe el tipo del nuevo comando
      byRoleButton(text: string | RegExp): Chainable<JQuery<HTMLElement>>;
    }
  }
}