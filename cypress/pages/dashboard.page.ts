// cypress/pages/dashboard.page.ts
// ====================================================================
// 📄 Clase: DashboardPage
// --------------------------------------------------------------------
// Este Page Object representa la pantalla principal del sistema
// (el “Dashboard” o página de inicio después del login).
//
// Su propósito es concentrar los selectores y verificaciones
// específicas de esta vista, para no repetir código en los tests.
//
// Este POM solo tiene una función: confirmar que el dashboard cargó.
// ====================================================================

export class DashboardPage {
  // Método: expectLoaded()
  // ----------------------------------------------------------------
  // Esta función valida que el dashboard se haya cargado correctamente.
  // Lo hace buscando en la pantalla un texto común de bienvenida o título.
  //
  // ✅ Usa un regex para cubrir variaciones:
  //    "Dashboard", "Inicio", "Bienvenido" o "Resumen".
  // ✅ Da hasta 10 segundos para aparecer (timeout: 10000).
  // ✅ Si lo encuentra visible → el dashboard se considera cargado.
  //
  // Ejemplo de uso:
  //    dashboardPage.expectLoaded();
  // ----------------------------------------------------------------
  expectLoaded() {
    cy.contains(/Dashboard|Inicio|Bienvenido|Resumen/i, { timeout: 10000 })
      .should("be.visible"); // asegura que el texto sea visible
  }
}

// Exporto una instancia lista para usar en los tests.
// Esto permite importar directamente:
//    import { dashboardPage } from "@pages/dashboard.page";
// y usar:
//    dashboardPage.expectLoaded();
export const dashboardPage = new DashboardPage();