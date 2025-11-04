// cypress/e2e/step_definitions/common.ts
// ====================================================================
// Aquí pongo todos los steps "reutilizables" de Cucumber:
// - login
// - logout
// - crear factura desde la UI
// - validar que la factura apareció en la tabla
// - búsquedas
// Esto se conecta con los .feature.
// ====================================================================

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"; // steps de Cucumber
import { expect } from "chai";                                                // para los asserts
import { loginPage } from "@pages/login.page";                                // mi POM de login
import { facturasPage } from "@pages/facturas.page";                          // mi POM de facturas

// ────────────────────────────────────────────────────────────────────
// LOGIN
// ────────────────────────────────────────────────────────────────────

// Step: "Given que abro la app"
// -> solo abre la URL base que tengo en cypress.config.ts
Given("que abro la app", () => {
  loginPage.visit();
});

// Step: "When ingreso el código de acceso válido"
// -> uso primero ACCESS_CODE si viene de env, si no AUTH_TOKEN, si no el hardcoded
When("ingreso el código de acceso válido", () => {
  // 1. saco el código desde env o pongo el que me dieron
  const code =
    Cypress.env("ACCESS_CODE") ||       // primero intento con ACCESS_CODE
    Cypress.env("AUTH_TOKEN") ||        // si no hay, uso el token
    "UXTY789@!!1";                      // fallback fijo

  // 2. escribo el código en el input que ya vimos en la app (#access-code)
  cy.get("#access-code", { timeout: 10000 })
    .should("be.visible")               // me aseguro que ya cargó
    .clear()
    .type(String(code));

  // 3. clic en el botón de entrar (hay más de uno, por eso el .first())
  cy.get('button[type="submit"], button#access-submit', { timeout: 10000 })
    .first()
    .click();
});

// Step: "When ingreso un código de acceso inválido '123'"
// -> reutilizo los métodos del POM de login
When("ingreso un código de acceso inválido {string}", (codigo: string) => {
  loginPage.fillAccessCode(codigo);
  loginPage.submit();
});

// Step: "Then debo ver el dashboard"
// -> la app quita el input cuando ya entré, así que valido que ya NO exista
Then("debo ver el dashboard", () => {
  // 1. ya no debe existir el input de código
  cy.get("#access-code", { timeout: 10000 }).should("not.exist");
  // 2. opcional: la URL ya no debe tener "login"
  cy.url().should("not.include", "login");
});

// Step para cuando el login falla
Then("debo ver un mensaje de error de acceso", () => {
  // uso lo que ya tengo en el POM
  loginPage.expectAccessError();
  loginPage.expectAccessScreen();
});

// Igual que el anterior pero con otro wording en el feature
Then("debo ver un mensaje de error y no ingresar", () => {
  loginPage.expectAccessError();
  loginPage.expectAccessScreen();
});

// ────────────────────────────────────────────────────────────────────
// LOGOUT
// ────────────────────────────────────────────────────────────────────

// Step: "When hago logout"
When("hago logout", () => {
  loginPage.logout();
});

// Step: "Then debo regresar a la pantalla de acceso"
Then("debo regresar a la pantalla de acceso", () => {
  loginPage.expectAccessScreen();
});

// ────────────────────────────────────────────────────────────────────
// FACTURAS (UI)
// ────────────────────────────────────────────────────────────────────

// Step: "When creo una nueva factura válida"
// -> aquí hago TODO el flujo de la pantalla de facturas
When("creo una nueva factura válida", () => {
  // 1. saco los datos que puse en cypress.config.ts → env
  const numero = Cypress.env("INVOICE_NUMBER");
  const total = Cypress.env("INVOICE_TOTAL");
  const estado = Cypress.env("INVOICE_STATUS") || "Vigente";

  // 2. intercepto el POST que hace la app cuando le doy "Crear"
  //    esto me sirve después en el Then para saber QUÉ creó el backend
  cy.intercept("POST", "**/V1/invoices").as("createInvoice");

  // 3. también intercepto el GET que la app hace después de crear
  //    porque la pantalla vuelve a pedir la lista
  cy.intercept("GET", "**/V1/invoices?page=1**").as("listInvoicesAfterCreate");

  // 4. ahora sí, interactúo con la UI usando mi POM
  facturasPage.clickCrearNueva();               // abre el formulario
  facturasPage.fillNumeroFactura(numero);       // escribe el número
  facturasPage.fillTotal(String(total));        // escribe el total
  facturasPage.selectEstado(estado);            // selecciona "Vigente"
  facturasPage.submitCrear();                   // guarda y espera el POST
});

// Step: "Then debo ver la factura creada en la lista con estado Vigente"
// -> aquí agarro lo que respondió el POST y lo busco en la tabla
Then("debo ver la factura creada en la lista con estado Vigente", () => {
  // 1. espero el POST de creación para saber el id y el número
  cy.wait("@createInvoice").then((create) => {
    // el backend me mandó el body de la factura
    const body = create.response?.body || {};

    // a veces viene como id, a veces _id → me quedo con cualquiera
    const createdId = body.id ?? body._id ?? null;

    // el número también puede venir en camelCase o snake_case
    const createdNumber =
      body.invoiceNumber ||
      body.invoice_number ||
      (Cypress.env("INVOICE_NUMBER") as string); // si no vino, uso el que escribí

    // normalizo para comparar con la tabla
    const targetId = createdId ? String(createdId).trim() : "";
    const targetNumber = String(createdNumber || "").trim().toLowerCase();

    // dejo esto en el log para que si algo falla yo vea qué devolvió el API
    cy.log(`🆔 id creado por API: ${targetId || "(no vino)"}`);
    cy.log(`🔎 número creado por API: ${targetNumber}`);

    // 2. espero a que la pantalla vuelva a pedir la lista
    cy.wait("@listInvoicesAfterCreate");

    // 3. ahora sí, leo las filas de la tabla de facturas
    //    este selector es el que vimos que realmente muestra las facturas
    const TABLE_ROWS_SELECTOR =
      "body > app-root > div > div > app-invoices > div.overflow-x-auto.mt-4 > table > tbody tr";

    cy.get(TABLE_ROWS_SELECTOR, { timeout: 15000 })
      .should("have.length.greaterThan", 0) // debe haber al menos una
      .then((rows) => {
        let found = false;        // bandera para saber si la encontramos
        const dump: string[] = []; // aquí guardo las filas para verlas en el log

        // recorro todas las filas del tbody
        Array.from(rows).forEach((row) => {
          // saco el texto completo de la fila
          const rowText = (row.textContent || "").toLowerCase().trim();

          // guardo la fila en el dump para debug
          dump.push(rowText);

          // comparo de 3 formas:
          // 1) por id
          const matchById = targetId && rowText.includes(targetId);
          // 2) por número de factura
          const matchByNumber =
            targetNumber && rowText.includes(targetNumber);
          // 3) que tenga el estado "vigente"
          const matchByStatus = rowText.includes("vigente");

          // si se cumple id o número + estado → la encontré
          if ((matchById || matchByNumber) && matchByStatus) {
            found = true;
          }
        });

        // imprimo todas las filas en el log de Cypress para saber qué llegó
        cy.log("📋 Filas encontradas en la tabla:");
        cy.log("```text\n" + dump.join("\n---\n") + "\n```");

        // también en consola por si lo corro en terminal
        // eslint-disable-next-line no-console
        console.log("📋 Filas de la tabla:", dump);

        // al final hago el assert
        expect(
          found,
          `No se encontró en la tabla una fila que contenga id="${targetId}" o número="${targetNumber}" y el texto "Vigente"`
        ).to.be.true;
      });
  });
});

// Step: "When activo incluir facturas eliminadas y busco"
// -> delego todo al POM de facturas
When("activo incluir facturas eliminadas y busco", () => {
  facturasPage.setIncludeDeletedAndSearch();
});

// Step: "Then deben mostrarse facturas eliminadas en los resultados"
Then("deben mostrarse facturas eliminadas en los resultados", () => {
  facturasPage.expectDeletedVisible();
});

// Step: "When busco la factura por número"
When("busco la factura por número", () => {
  facturasPage.searchByNumero(Cypress.env("INVOICE_NUMBER"));
});

// Step: "Then debo ver FACTURA-CRIS en los resultados"
Then("debo ver FACTURA-CRIS en los resultados", () => {
  facturasPage
    .rowByNumero(Cypress.env("INVOICE_NUMBER"))
    .should("exist")
    .and("be.visible");
});

// Step: "When elimino la factura FACTURA-CRIS"
When("elimino la factura FACTURA-CRIS", () => {
  facturasPage.deleteByNumero(Cypress.env("INVOICE_NUMBER"));
});

// Step: "Then la factura debe eliminarse o quedar con estado Eliminada"
Then("la factura debe eliminarse o quedar con estado Eliminada", () => {
  facturasPage.expectDeletedOrAbsent(Cypress.env("INVOICE_NUMBER"));
});