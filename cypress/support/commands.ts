/// <reference types="cypress" />

// Comandos mínimos. La lógica vive en Page Objects.
Cypress.Commands.add("byRoleButton", (text: string | RegExp) => {
  return cy.contains('button, [role="button"]', text);
});

declare global {
  namespace Cypress {
    interface Chainable {
      byRoleButton(text: string | RegExp): Chainable<JQuery<HTMLElement>>;
    }
  }
}