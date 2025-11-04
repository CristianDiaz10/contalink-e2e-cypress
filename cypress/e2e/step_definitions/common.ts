// cypress/e2e/step_definitions/common.ts
import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";
import { expect } from "chai";
import { loginPage } from "@pages/login.page";
import { facturasPage } from "@pages/facturas.page";

// --- Login ---
Given("que abro la app", () => {
  loginPage.visit();
});

// Acceso con código válido
When("ingreso el código de acceso válido", () => {
  const code =
    Cypress.env("ACCESS_CODE") ||
    Cypress.env("AUTH_TOKEN") ||
    "UXTY789@!!1";

  cy.get("#access-code", { timeout: 10000 })
    .should("be.visible")
    .clear()
    .type(String(code));

  cy.get('button[type="submit"], button#access-submit', { timeout: 10000 })
    .first()
    .click();
});

// Acceso con código inválido
When("ingreso un código de acceso inválido {string}", (codigo: string) => {
  loginPage.fillAccessCode(codigo);
  loginPage.submit();
});

Then("debo ver el dashboard", () => {
  cy.get("#access-code", { timeout: 10000 }).should("not.exist");
  cy.url().should("not.include", "login");
});

// errores de acceso
Then("debo ver un mensaje de error de acceso", () => {
  loginPage.expectAccessError();
  loginPage.expectAccessScreen();
});

Then("debo ver un mensaje de error y no ingresar", () => {
  loginPage.expectAccessError();
  loginPage.expectAccessScreen();
});

// --- Logout ---
When("hago logout", () => {
  loginPage.logout();
});

Then("debo regresar a la pantalla de acceso", () => {
  loginPage.expectAccessScreen();
});

// --- Facturas ---
When("creo una nueva factura válida", () => {
  const numero = Cypress.env("INVOICE_NUMBER");
  const total = Cypress.env("INVOICE_TOTAL");
  const estado = Cypress.env("INVOICE_STATUS") || "Vigente";

  // 1) interceptamos el POST de creación
  cy.intercept("POST", "**/V1/invoices").as("createInvoice");

  // 2) interceptamos también el GET que la app hace después de crear
  //    la app está llamando: GET https://candidates-api.contalink.com/V1/invoices?page=1
  cy.intercept("GET", "**/V1/invoices?page=1**").as("listInvoicesAfterCreate");

  // 3) llenamos el form
  facturasPage.clickCrearNueva();
  facturasPage.fillNumeroFactura(numero);
  facturasPage.fillTotal(String(total));
  facturasPage.selectEstado(estado);
  facturasPage.submitCrear();
});

Then("debo ver la factura creada en la lista con estado Vigente", () => {
  // 1) esperamos el POST para saber qué se creó
  cy.wait("@createInvoice").then((create) => {
    const body = create.response?.body || {};

    const createdId = body.id ?? body._id ?? null;
    const createdNumber =
      body.invoiceNumber ||
      body.invoice_number ||
      (Cypress.env("INVOICE_NUMBER") as string);

    const targetId = createdId ? String(createdId).trim() : "";
    const targetNumber = String(createdNumber || "").trim().toLowerCase();

    cy.log(`🆔 id creado por API: ${targetId || "(no vino)"}`);
    cy.log(`🔎 número creado por API: ${targetNumber}`);

    // 2) esperamos la recarga de la tabla que hace la app
    cy.wait("@listInvoicesAfterCreate");

    // 3) leemos TODAS las filas de la tabla
    const TABLE_ROWS_SELECTOR =
      "body > app-root > div > div > app-invoices > div.overflow-x-auto.mt-4 > table > tbody tr";

    cy.get(TABLE_ROWS_SELECTOR, { timeout: 15000 })
      .should("have.length.greaterThan", 0)
      .then((rows) => {
        let found = false;
        const dump: string[] = [];

        Array.from(rows).forEach((row) => {
          // texto completo de la fila
          const rowText = (row.textContent || "").toLowerCase().trim();

          dump.push(rowText);

          // match por id
          const matchById = targetId && rowText.includes(targetId);
          // match por número de factura
          const matchByNumber =
            targetNumber && rowText.includes(targetNumber);
          // match por estado
          const matchByStatus = rowText.includes("vigente");

          if ((matchById || matchByNumber) && matchByStatus) {
            found = true;
          }
        });

        // lo dejamos logueado para debug
        cy.log("📋 Filas encontradas en la tabla:");
        cy.log("```text\n" + dump.join("\n---\n") + "\n```");
        // también consola
        // eslint-disable-next-line no-console
        console.log("📋 Filas de la tabla:", dump);

        expect(
          found,
          `No se encontró en la tabla una fila que contenga id="${targetId}" o número="${targetNumber}" y el texto "Vigente"`
        ).to.be.true;
      });
  });
});

When("activo incluir facturas eliminadas y busco", () => {
  facturasPage.setIncludeDeletedAndSearch();
});

Then("deben mostrarse facturas eliminadas en los resultados", () => {
  facturasPage.expectDeletedVisible();
});

When("busco la factura por número", () => {
  facturasPage.searchByNumero(Cypress.env("INVOICE_NUMBER"));
});

Then("debo ver FACTURA-CRIS en los resultados", () => {
  facturasPage
    .rowByNumero(Cypress.env("INVOICE_NUMBER"))
    .should("exist")
    .and("be.visible");
});

When("elimino la factura FACTURA-CRIS", () => {
  facturasPage.deleteByNumero(Cypress.env("INVOICE_NUMBER"));
});

Then("la factura debe eliminarse o quedar con estado Eliminada", () => {
  facturasPage.expectDeletedOrAbsent(Cypress.env("INVOICE_NUMBER"));
});