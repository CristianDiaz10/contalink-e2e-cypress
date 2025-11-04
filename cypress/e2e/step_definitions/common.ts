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
  cy.log("🌐 Abriendo la aplicación...");
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

  cy.log(`🔐 Ingresando código de acceso: ${code}`);

  // 2. escribo el código en el input que ya vimos en la app (#access-code)
  cy.get("#access-code", { timeout: 10000 })
    .should("be.visible")               // me aseguro que ya cargó
    .clear()
    .type(String(code));

  // 3. clic en el botón de entrar (hay más de uno, por eso el .first())
  cy.get('button[type="submit"], button#access-submit', { timeout: 10000 })
    .first()
    .click();

  cy.log("✅ Código enviado, esperando que cargue el dashboard...");
});

// Step: "When ingreso un código de acceso inválido '123'"
// -> reutilizo los métodos del POM de login
When("ingreso un código de acceso inválido {string}", (codigo: string) => {
  cy.log(`🔐 Probando código inválido: ${codigo}`);
  loginPage.fillAccessCode(codigo);
  loginPage.submit();
});

// Step: "Then debo ver el dashboard"
// -> la app quita el input cuando ya entré, así que valido que ya NO exista
Then("debo ver el dashboard", () => {
  cy.log("👀 Verificando que ya no aparezca la pantalla de acceso...");
  // 1. ya no debe existir el input de código
  cy.get("#access-code", { timeout: 10000 }).should(
    "not.exist",
    "Ya no debe mostrarse el input de acceso porque el login fue correcto"
  );
  // 2. opcional: la URL ya no debe tener "login"
  cy.url().should(
    "not.include",
    "login",
    "La URL no debe seguir en la pantalla de login"
  );
  cy.log("🏠 Dashboard visible (o al menos ya no estamos en login).");
});

// Step para cuando el login falla
Then("debo ver un mensaje de error de acceso", () => {
  cy.log("❗ Verificando que la app mostró un mensaje de error de acceso...");
  loginPage.expectAccessError();
  loginPage.expectAccessScreen();
  cy.log("✅ La app se quedó en la pantalla de acceso (como debía).");
});

// Igual que el anterior pero con otro wording en el feature
Then("debo ver un mensaje de error y no ingresar", () => {
  cy.log("❗ Verificando mensaje de error de acceso...");
  loginPage.expectAccessError();
  loginPage.expectAccessScreen();
  cy.log("✅ No entró a la app con credenciales inválidas.");
});

// ────────────────────────────────────────────────────────────────────
// LOGOUT
// ────────────────────────────────────────────────────────────────────

// Step: "When hago logout"
When("hago logout", () => {
  cy.log("🚪 Haciendo logout...");
  loginPage.logout();
});

// Step: "Then debo regresar a la pantalla de acceso"
Then("debo regresar a la pantalla de acceso", () => {
  cy.log("👀 Verificando que volvimos a la pantalla de acceso...");
  loginPage.expectAccessScreen();
  cy.log("✅ Logout confirmado, estamos en la pantalla de acceso.");
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

  cy.log(
    `🧾 Creando factura desde la UI con: número=${numero}, total=${total}, estado=${estado}`
  );

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

  cy.log("✅ Se envió el formulario de creación de factura.");
});

// Step: "Then debo ver la factura creada en la lista con estado Vigente"
// -> aquí agarro lo que respondió el POST y lo busco en la tabla
Then("debo ver la factura creada en la lista con estado Vigente", () => {
  // 1. espero el POST para saber qué se creó
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

    // 2. espero a que la pantalla vuelva a pedir la lista
    cy.wait("@listInvoicesAfterCreate");

    // 3. ahora sí, leo las filas de la tabla de facturas
    const TABLE_ROWS_SELECTOR =
      "body > app-root > div > div > app-invoices > div.overflow-x-auto.mt-4 > table > tbody tr";

    cy.get(TABLE_ROWS_SELECTOR, { timeout: 15000 })
      .should(
        "have.length.greaterThan",
        0,
        "La tabla de facturas debe tener al menos 1 registro"
      )
      .then((rows) => {
        let found = false;
        const dump: string[] = [];

        Array.from(rows).forEach((row) => {
          const rowText = (row.textContent || "").toLowerCase().trim();
          dump.push(rowText);

          const matchById = targetId && rowText.includes(targetId);
          const matchByNumber =
            targetNumber && rowText.includes(targetNumber);
          const matchByStatus = rowText.includes("vigente");

          if ((matchById || matchByNumber) && matchByStatus) {
            found = true;
          }
        });

        // lo dejamos logueado para debug
        cy.log("📋 Filas encontradas en la tabla:");
        cy.log("```text\n" + dump.join("\n---\n") + "\n```");
        // eslint-disable-next-line no-console
        console.log("📋 Filas de la tabla:", dump);

        expect(
          found,
          // 👇 mensaje más sencillo para alguien no técnico
          `❌ No se encontró en la tabla la factura recién creada (busqué por id="${targetId}" o número="${targetNumber}" y estado "Vigente"). Revisa si la API sí la devolvió en el listado.`
        ).to.be.true;

        if (found) {
          cy.log("✅ La factura recién creada SÍ aparece en la tabla con estado Vigente.");
        }
      });
  });
});

// Step: "When activo incluir facturas eliminadas y busco"
// -> delego todo al POM de facturas
When("activo incluir facturas eliminadas y busco", () => {
  cy.log("🟣 Activando filtro 'Incluir facturas eliminadas' y ejecutando búsqueda...");
  facturasPage.setIncludeDeletedAndSearch();
});

// Step: "Then deben mostrarse facturas eliminadas en los resultados"
Then("deben mostrarse facturas eliminadas en los resultados", () => {
  cy.log("👀 Buscando en el listado alguna factura marcada como eliminada...");
  facturasPage.expectDeletedVisible();
  cy.log("✅ Se encontraron facturas eliminadas en el resultado.");
});

// Step: "When busco la factura por número"
When("busco la factura por número", () => {
  const num = Cypress.env("INVOICE_NUMBER");
  cy.log(`🔍 Buscando la factura por número: ${num}`);
  facturasPage.searchByNumero(num);
});

// Step: "Then debo ver FACTURA-CRIS en los resultados"
Then("debo ver FACTURA-CRIS en los resultados", () => {
  const num = Cypress.env("INVOICE_NUMBER");
  facturasPage
    .rowByNumero(num)
    .should("exist", `Debo ver la fila con el número de factura "${num}"`)
    .and("be.visible", "La fila de esa factura debe mostrarse visible en la tabla");
  cy.log("✅ La factura buscada aparece en los resultados.");
});

// Step: "When elimino la factura FACTURA-CRIS"
When("elimino la factura FACTURA-CRIS", () => {
  const num = Cypress.env("INVOICE_NUMBER");
  cy.log(`🗑️ Eliminando la factura con número: ${num}`);
  facturasPage.deleteByNumero(num);
});

// Step: "Then la factura debe eliminarse o quedar con estado Eliminada"
Then("la factura debe eliminarse o quedar con estado Eliminada", () => {
  const num = Cypress.env("INVOICE_NUMBER");
  cy.log("👀 Verificando que la factura fue eliminada o quedó marcada como eliminada...");
  facturasPage.expectDeletedOrAbsent(num);
  cy.log("✅ La factura ya no aparece como vigente.");
});