export class DashboardPage {
  expectLoaded() {
    cy.contains(/Dashboard|Inicio|Bienvenido|Resumen/i, { timeout: 10000 }).should("be.visible");
  }
}
export const dashboardPage = new DashboardPage();