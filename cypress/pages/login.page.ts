// cypress/pages/login.page.ts
// ====================================================================
// 📄 Page Object: LoginPage
// --------------------------------------------------------------------
// Aquí centralizo TODO lo relacionado con el login de la app:
//
// - ir a la pantalla de acceso
// - escribir el código
// - enviar (con éxito o no)
// - validar que entró
// - validar error
// - hacer logout
//
// Así en los steps solo llamo loginPage.visit(), loginPage.logout(), etc.
// ====================================================================

import "cypress-xpath"; // lo usamos para el botón de logout que viene en XPath

// 🔩 Selectores base de la pantalla de login
const LOGIN_PATH = "/";                 // la app muestra el login en "/"
const ACCESS_INPUT = "#access-code";    // input donde se escribe el código
const SUBMIT_BTN = 'button[type="submit"]';

// 🔎 Selectores “bonitos” por si la app pone data-testid algún día
const DASHBOARD_SELECTOR = '[data-testid="dashboard"]';
const ACCESS_ERROR_SELECTOR = '[data-testid="access-error"]';

export class LoginPage {
  // --------------------------------------------------------------
  // 1) visitar la pantalla de login
  // --------------------------------------------------------------
  visit() {
    cy.log("📄 Abriendo la pantalla de acceso…");
    cy.visit(LOGIN_PATH);
    // me aseguro de que el input ya cargó
    cy.get(ACCESS_INPUT, { timeout: 15000 })
      .should("exist", "✅ El campo para escribir el código de acceso existe.")
      .and("be.visible", "✅ El campo de código está visible.");
  }

  // --------------------------------------------------------------
  // 2) escribir el código de acceso
  // --------------------------------------------------------------
  fillAccessCode(code: string) {
    cy.log(`✏️ Escribiendo el código de acceso: ${code}`);
    cy.get(ACCESS_INPUT, { timeout: 10000 })
      .scrollIntoView()
      .should("be.visible", "✅ El campo de código está listo para escribir.")
      .clear()
      .type(code, { delay: 10 }); // delay chiquito para que en video se vea bonito
  }

  // --------------------------------------------------------------
  // 3A) enviar SIN esperar éxito (para casos negativos)
  // --------------------------------------------------------------
  submit() {
    cy.log("📨 Enviando el formulario de acceso (sin esperar dashboard)…");
    cy.get(SUBMIT_BTN, { timeout: 10000 })
      .scrollIntoView()
      .should("exist", "✅ El botón de enviar existe.")
      .and("not.be.disabled", "✅ El botón de enviar no está deshabilitado.")
      .click({ force: true });
  }

  // --------------------------------------------------------------
  // 3B) enviar esperando éxito (para login OK)
  // --------------------------------------------------------------
  submitExpectSuccess() {
    cy.log("✅ Enviando el formulario y esperando la carga del dashboard…");

    // la app hace GET /V1/invoices cuando entra, lo esperamos
    cy.intercept("GET", "**/V1/invoices**", { times: 1 }).as("getInvoices");

    cy.get(SUBMIT_BTN, { timeout: 10000 })
      .scrollIntoView()
      .should("exist", "✅ El botón de enviar existe.")
      .and("be.visible", "✅ El botón de enviar está visible.")
      .click({ force: true });

    // esperamos la llamada y validamos 2xx
    cy.wait("@getInvoices", { timeout: 20000 }).then((interception) => {
      const code = Number(interception?.response?.statusCode);
      if (!(code >= 200 && code < 300)) {
        throw new Error(`❌ La app intentó cargar las facturas pero respondió ${code}`);
      }
      cy.log("📦 La app cargó las facturas después de hacer login.");
    });

    // aquí podríamos validar visual si quieres
  }

  // --------------------------------------------------------------
  // 4) flujo rápido: login en una sola llamada
  // --------------------------------------------------------------
  loginWith(code: string) {
    cy.log("⚡ Login rápido con código directamente.");
    this.visit();
    this.fillAccessCode(code);
    this.submit(); // aquí no espero éxito, eso lo decide el test
  }

  // --------------------------------------------------------------
  // 5) validar que ya estoy dentro
  // --------------------------------------------------------------
  expectDashboard() {
    cy.log("🔎 Verificando que ya no estoy en la pantalla de acceso…");

    // 1) el input de acceso ya no debe estar
    cy.get(ACCESS_INPUT).should(
      "not.exist",
      "✅ Ya no se muestra el campo de acceso, o sea que la app me dejó entrar."
    );

    // 2) si hay un data-testid especial para el dashboard, úsalo
    cy.get("body").then(($b) => {
      if ($b.find(DASHBOARD_SELECTOR).length) {
        cy.get(DASHBOARD_SELECTOR, { timeout: 10000 }).should(
          "be.visible",
          "✅ Se ve el contenedor principal del dashboard."
        );
        return;
      }
    });

    // 3) fallback genérico: validamos que haya “algo de la app” (tabla/lista)
    cy.get("table, [data-testid='invoices-list'], [role='table'], .grid, .list", {
      timeout: 10000,
    }).should("exist", "✅ Se ve contenido de la pantalla principal (tabla/lista).");
  }

  // --------------------------------------------------------------
  // 6) validar error de acceso (código inválido)
  // --------------------------------------------------------------
  expectAccessError() {
    cy.log("🚫 Validando que la app mostró un error de acceso…");
    cy.get("body").then(($b) => {
      // si la app muestra un mensaje específico, lo verificamos
      if ($b.find(ACCESS_ERROR_SELECTOR).length) {
        cy.get(ACCESS_ERROR_SELECTOR).should(
          "be.visible",
          "✅ El mensaje de error de acceso está visible."
        );
      } else {
        // si no tiene mensaje, al menos que el input haya quedado inválido
        cy.get(ACCESS_INPUT, { timeout: 8000 })
          .should("exist")
          .and(($el) => {
            const el = $el[0] as HTMLInputElement;
            const hasNgInvalid = ($el.attr("class") || "").includes("ng-invalid");
            const ariaInvalid = el.getAttribute("aria-invalid") === "true";

            if (!hasNgInvalid && !ariaInvalid) {
              throw new Error(
                "❌ No se encontró mensaje de error ni se marcó el input como inválido."
              );
            }
          });
      }
    });
  }

  // --------------------------------------------------------------
  // 7) validar que SIGO en login
  // --------------------------------------------------------------
  expectAccessScreen() {
    cy.log("🟦 Confirmando que sigo en la pantalla de acceso…");
    cy.get(ACCESS_INPUT, { timeout: 8000 })
      .should("exist", "✅ El input de acceso sigue visible.")
      .and("be.visible");
    cy.get(DASHBOARD_SELECTOR).should(
      "not.exist",
      "✅ No hay dashboard visible, sigo en el login."
    );
  }

  // --------------------------------------------------------------
  // 8) logout
  // --------------------------------------------------------------
  logout() {
    cy.log("🚪 Cerrando sesión (logout)…");

    // botón que vimos en tu HTML
    const LOGOUT_BTN_XPATH = "/html/body/app-root/div/div/div/button";

    cy.xpath(LOGOUT_BTN_XPATH, { timeout: 10000 })
      .should("exist", "✅ Existe el botón de cerrar sesión.")
      .and("be.visible", "✅ El botón de cerrar sesión está visible.")
      .click({ force: true });

    // al salir, debe volver a aparecer el input de acceso
    cy.get("#access-code", { timeout: 10000 }).should(
      "be.visible",
      "✅ Volvió a aparecer el campo de acceso, o sea que el logout funcionó."
    );
  }
}

// exporto una instancia lista para usar en los step definitions
export const loginPage = new LoginPage();