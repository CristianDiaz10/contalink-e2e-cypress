/// <reference types="cypress" />
// ↑ Le digo a TS: "este archivo usa tipos de Cypress"

//
// cypress/support/commands.ts
// Aquí van mis comandos personalizados.
// La lógica gorda vive en los Page Objects, aquí solo helpers chiquitos.
//

// 1) Agrego un comando llamado "byRoleButton"
//    Lo voy a usar para encontrar botones ya sea porque son <button>
//    o porque tienen role="button", y puedo buscar por texto o regex.
Cypress.Commands.add("byRoleButton", (text: string | RegExp) => {
  // cy.contains(...) ya devuelve un Chainable, así que solo lo regreso.
  return cy.contains('button, [role="button"]', text);
});

// 2) Esto convierte el archivo en un "módulo" de TypeScript.
//    Sin esto, la ampliación de tipos de abajo a veces no se aplica.
export {};

// 3) Extiendo los tipos de Cypress para que TS no se queje cuando haga
//    cy.byRoleButton(...)
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Busca un botón (<button> o cualquier elemento con role="button")
       * cuyo texto coincida.
       *
       * Ejemplos:
       *   cy.byRoleButton("Guardar").click()
       *   cy.byRoleButton(/crear/i).should("be.visible")
       */
      byRoleButton(text: string | RegExp): Chainable<any>;
      // ↑ uso Chainable<any> para evitar el error:
      // "Type 'Chainable' is not generic"
    }
  }
}