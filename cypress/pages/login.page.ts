import "cypress-xpath";

const LOGIN_PATH = "/"; // la app muestra el login en "/"
const ACCESS_INPUT = "#access-code";
const SUBMIT_BTN = 'button[type="submit"]';

const DASHBOARD_SELECTOR = '[data-testid="dashboard"]';
const ACCESS_ERROR_SELECTOR = '[data-testid="access-error"]';

export class LoginPage {
  visit() {
    cy.visit(LOGIN_PATH);
    cy.get(ACCESS_INPUT, { timeout: 15000 })
      .should("exist")
      .and("be.visible");
  }

  fillAccessCode(code: string) {
    cy.get(ACCESS_INPUT, { timeout: 10000 })
      .scrollIntoView()
      .should("be.visible")
      .clear()
      .type(code, { delay: 10 });
  }

submit() {
  // Solo hace clic, sin esperar llamadas de red
  // Úsalo para casos como "código inválido"
  cy.get('button[type="submit"]', { timeout: 10000 })
    .scrollIntoView()
    .should('exist')
    .and('not.be.disabled')
    .click({ force: true });
}

submitExpectSuccess() {
  // Espera la carga del dashboard (la app llama a /V1/invoices tras login exitoso)
  cy.intercept("GET", "**/V1/invoices**", { times: 1 }).as("getInvoices");

  cy.get('button[type="submit"]', { timeout: 10000 })
    .scrollIntoView()
    .should("exist")
    .and("be.visible")
    .click({ force: true }); // si el botón a veces empieza disabled, puedes usar .click({ force: true })

  // Verifica que el dashboard respondió 2xx
  cy.wait("@getInvoices", { timeout: 20000 }).then((interception) => {
    const code = Number(interception?.response?.statusCode);
    if (!(code >= 200 && code < 300)) {
      throw new Error(`Unexpected status code de invoices: ${code}`);
    }
  });

  // (Opcional) Si quieres una señal visual mínima post-login, usa algo genérico:
  // cy.get("table, [data-testid='invoices-list'], [role='table'], .grid, .list", { timeout: 10000 })
  //   .should("exist");
}

  loginWith(code: string) {
    this.visit();
    this.fillAccessCode(code);
    this.submit();
  }

  expectDashboard() {
    // 1) El formulario ya no debe estar visible
    cy.get(ACCESS_INPUT).should("not.exist");

    // 2) Si hay un contenedor confiable del dashboard, úsalo
    cy.get("body").then(($b) => {
      if ($b.find(DASHBOARD_SELECTOR).length) {
        cy.get(DASHBOARD_SELECTOR, { timeout: 10000 }).should("be.visible");
        return;
      }
    });

    // 3) Fallbacks genéricos (lista/tabla de facturas, grids, etc.)
    cy.get("table, [data-testid='invoices-list'], [role='table'], .grid, .list", {
      timeout: 10000,
    }).should("exist");
  }

  // Para inválido: valida mensaje o estado inválido del input
  expectAccessError() {
    cy.get("body").then(($b) => {
      if ($b.find(ACCESS_ERROR_SELECTOR).length) {
        cy.get(ACCESS_ERROR_SELECTOR).should("be.visible");
      } else {
        cy.get(ACCESS_INPUT, { timeout: 8000 })
          .should("exist")
          .and(($el) => {
            const el = $el[0] as HTMLInputElement;
            const hasNgInvalid = ($el.attr("class") || "").includes("ng-invalid");
            const ariaInvalid = el.getAttribute("aria-invalid") === "true";
            if (!hasNgInvalid && !ariaInvalid) {
              throw new Error(
                "No se encontró mensaje visible NI estado inválido (ng-invalid/aria-invalid) en el input."
              );
            }
          });
      }
    });
  }

  // No dependas de la URL; valida que sigues en pantalla de acceso
  expectAccessScreen() {
    cy.get(ACCESS_INPUT, { timeout: 8000 }).should("exist").and("be.visible");
    cy.get(DASHBOARD_SELECTOR).should("not.exist");
  }

  logout() {
    // 1️⃣ Primero intenta el botón real por tu XPath
    const LOGOUT_BTN_XPATH = '/html/body/app-root/div/div/div/button';

    cy.xpath(LOGOUT_BTN_XPATH, { timeout: 10000 })
      .should('exist')
      .and('be.visible')
      .click({ force: true });

    // 2️⃣ Si en el futuro agregan data-testid o texto, puedes dejar fallback
    // cy.contains('button, [role="button"], a', /Cerrar sesi[oó]n|Salir|Logout/i, { timeout: 8000 })
    //   .click({ force: true });

    // 3️⃣ Verifica que regresas a la pantalla de acceso
    cy.get('#access-code', { timeout: 10000 }).should('be.visible');
  }
}

export const loginPage = new LoginPage();