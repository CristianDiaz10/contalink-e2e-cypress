// cypress/pages/login.page.ts
// ====================================================================
// 📄 Page Object: LoginPage
// --------------------------------------------------------------------
// Aquí centralizo TODO lo relacionado con el login de la app:
//
// - entrar a la página de acceso
// - escribir el código
// - enviar el formulario (con o sin esperar éxito)
// - validar que entré al dashboard
// - validar error de acceso
// - hacer logout
//
// Así los step definitions solo llaman métodos y no tienen que saber
// de XPaths ni de timeouts.
// ====================================================================

import "cypress-xpath"; // lo usamos para el botón de logout que está en XPath

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
    cy.visit(LOGIN_PATH); // voy a "/"
    // me aseguro de que el input de código ya está visible
    cy.get(ACCESS_INPUT, { timeout: 15000 })
      .should("exist")
      .and("be.visible");
  }

  // --------------------------------------------------------------
  // 2) escribir el código de acceso
  // --------------------------------------------------------------
  fillAccessCode(code: string) {
    cy.get(ACCESS_INPUT, { timeout: 10000 })
      .scrollIntoView()      // por si el input está más abajo
      .should("be.visible")  // debe verse
      .clear()               // limpio lo que haya
      .type(code, { delay: 10 }); // escribo el código (delay pequeño para que se vea en video)
  }

  // --------------------------------------------------------------
  // 3A) enviar SIN esperar que todo salga bien
  //     (lo uso en casos negativos: código inválido)
  // --------------------------------------------------------------
  submit() {
    // Solo hace clic, no espera XHR ni dashboard
    cy.get('button[type="submit"]', { timeout: 10000 })
      .scrollIntoView()
      .should('exist')
      .and('not.be.disabled')
      .click({ force: true });
  }

  // --------------------------------------------------------------
  // 3B) enviar PERO esperando éxito
  //     (lo uso en casos positivos: login OK)
  // --------------------------------------------------------------
  submitExpectSuccess() {
    // ⚠️ la app hace un GET a /V1/invoices cuando el login es válido,
    // así que lo interceptamos para saber cuándo terminó.
    cy.intercept("GET", "**/V1/invoices**", { times: 1 }).as("getInvoices");

    cy.get('button[type="submit"]', { timeout: 10000 })
      .scrollIntoView()
      .should("exist")
      .and("be.visible")
      .click({ force: true }); // force por si el botón arranca deshabilitado

    // aquí esperamos la llamada que hace la app tras loguearse
    cy.wait("@getInvoices", { timeout: 20000 }).then((interception) => {
      const code = Number(interception?.response?.statusCode);
      // si no es 2xx, fallamos de una vez
      if (!(code >= 200 && code < 300)) {
        throw new Error(`Unexpected status code de invoices: ${code}`);
      }
    });

    // si quisieras, podrías validar que aparece la tabla de facturas:
    // cy.get("table, [data-testid='invoices-list'], [role='table'], .grid, .list", { timeout: 10000 })
    //   .should("exist");
  }

  // --------------------------------------------------------------
  // 4) flujo rápido: login en una sola llamada
  // --------------------------------------------------------------
  loginWith(code: string) {
    this.visit();
    this.fillAccessCode(code);
    this.submit(); // aquí no espero éxito, dejo que el test lo haga
  }

  // --------------------------------------------------------------
  // 5) validar que ya estoy dentro (dashboard o pantalla principal)
  // --------------------------------------------------------------
  expectDashboard() {
    // 1) el input de login ya no debe existir
    cy.get(ACCESS_INPUT).should("not.exist");

    // 2) si la app tiene un data-testid concreto para el dashboard, úsalo
    cy.get("body").then(($b) => {
      if ($b.find(DASHBOARD_SELECTOR).length) {
        cy.get(DASHBOARD_SELECTOR, { timeout: 10000 }).should("be.visible");
        return; // ya validé, no necesito seguir
      }
    });

    // 3) fallback genérico: la pantalla de facturas trae una tabla/lista,
    //    con esto evitamos que la prueba sea frágil.
    cy.get("table, [data-testid='invoices-list'], [role='table'], .grid, .list", {
      timeout: 10000,
    }).should("exist");
  }

  // --------------------------------------------------------------
  // 6) validar error de acceso (código inválido)
  // --------------------------------------------------------------
  expectAccessError() {
    // algunas apps muestran un mensaje de error fijo
    cy.get("body").then(($b) => {
      if ($b.find(ACCESS_ERROR_SELECTOR).length) {
        // si existe el div de error, lo validamos
        cy.get(ACCESS_ERROR_SELECTOR).should("be.visible");
      } else {
        // si NO hay div de error, validamos que el input quedó en estado inválido
        cy.get(ACCESS_INPUT, { timeout: 8000 })
          .should("exist")
          .and(($el) => {
            const el = $el[0] as HTMLInputElement;
            const hasNgInvalid = ($el.attr("class") || "").includes("ng-invalid");
            const ariaInvalid = el.getAttribute("aria-invalid") === "true";

            // si no marcó nada, entonces para nosotros es error
            if (!hasNgInvalid && !ariaInvalid) {
              throw new Error(
                "No se encontró mensaje visible NI estado inválido (ng-invalid/aria-invalid) en el input."
              );
            }
          });
      }
    });
  }

  // --------------------------------------------------------------
  // 7) validar que SIGO en la pantalla de login
  //    (por ejemplo, después de un acceso inválido)
  // --------------------------------------------------------------
  expectAccessScreen() {
    // debe seguir el input
    cy.get(ACCESS_INPUT, { timeout: 8000 }).should("exist").and("be.visible");
    // y no debe haber dashboard
    cy.get(DASHBOARD_SELECTOR).should("not.exist");
  }

  // --------------------------------------------------------------
  // 8) logout
  // --------------------------------------------------------------
  logout() {
    // el botón que vimos en tu HTML era por XPath
    const LOGOUT_BTN_XPATH = '/html/body/app-root/div/div/div/button';

    cy.xpath(LOGOUT_BTN_XPATH, { timeout: 10000 })
      .should('exist')
      .and('be.visible')
      .click({ force: true });

    // después del logout, debe volver a aparecer el input de acceso
    cy.get('#access-code', { timeout: 10000 }).should('be.visible');
  }
}

// exporto una instancia lista para usar en los step definitions
export const loginPage = new LoginPage();