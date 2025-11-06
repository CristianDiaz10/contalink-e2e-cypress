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

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"; // 👉 importo las palabras clave de Cucumber (Given/When/Then)
import { expect } from "chai";                                                // 👉 uso chai para hacer asserts bonitos
import { loginPage } from "@pages/login.page";                                // 👉 mi Page Object de login
import { facturasPage } from "@pages/facturas.page";                          // 👉 mi Page Object de facturas

// ────────────────────────────────────────────────────────────────────
// LOGIN
// ────────────────────────────────────────────────────────────────────

// Step: "Given que abro la app"
Given("que abro la app", () => {
  cy.log("🌐 Abriendo la aplicación..."); // 👉 dejo traza en el runner para humanos
  loginPage.visit();                     // 👉 delego al POM la visita al login
});

// Step: "When ingreso el código de acceso válido"
When("ingreso el código de acceso válido", () => {
  // 👉 primero intento leer el código desde variables de entorno
  const code =
    Cypress.env("ACCESS_CODE") ||       // 👉 si en GitHub o local pongo ACCESS_CODE, uso ese
    Cypress.env("AUTH_TOKEN") ||        // 👉 si no, pruebo con AUTH_TOKEN
    "UXTY789@!!1";                      // 👉 si nada viene, uso este hardcodeado

  cy.log(`🔐 Ingresando código de acceso: ${code}`); // 👉 para que en el log quede claro qué se usó

  cy.get("#access-code", { timeout: 10000 }) // 👉 espero a que el input exista
    .should("be.visible")                   // 👉 y que se vea
    .clear()                                // 👉 limpio lo que tenga
    .type(String(code));                    // 👉 escribo el código

  cy.get('button[type="submit"], button#access-submit', { timeout: 10000 }) // 👉 hay más de un botón, por eso uso dos selectores
    .first()                                                              // 👉 tomo el primero que encuentre
    .click();                                                             // 👉 lo clickeo

  cy.log("✅ Código enviado, esperando que cargue el dashboard..."); // 👉 mensaje amigable
});

// Step: "When ingreso un código de acceso inválido "123""
When("ingreso un código de acceso inválido {string}", (codigo: string) => {
  cy.log(`🔐 Probando código inválido: ${codigo}`); // 👉 dejo claro que es un caso negativo
  loginPage.fillAccessCode(codigo);                // 👉 escribo el código malo
  loginPage.submit();                              // 👉 envío SIN esperar éxito
});

// Step: "Then debo ver el dashboard"
Then("debo ver el dashboard", () => {
  cy.log("👀 Verificando que ya no aparezca la pantalla de acceso..."); // 👉 explico qué estoy validando

  cy.get("#access-code", { timeout: 10000 })                   // 👉 busco el input de acceso
    .should(                                                   // 👉 y afirmo que…
      "not.exist",                                             // 👉 …ya no debe existir
      "Ya no debe mostrarse el input de acceso porque el login fue correcto"
    );

  cy.url().should(                                             // 👉 segunda validación: la URL ya no debe ser de login
    "not.include",
    "login",
    "La URL no debe seguir en la pantalla de login"
  );

  cy.log("🏠 Dashboard visible (o al menos ya no estamos en login)."); // 👉 mensaje final
});

// Step: "Then debo ver un mensaje de error de acceso"
Then("debo ver un mensaje de error de acceso", () => {
  cy.log("❗ Verificando que la app mostró un mensaje de error de acceso..."); // 👉 indico que es un caso de error
  loginPage.expectAccessError();                                              // 👉 delego al POM la validación del error
  loginPage.expectAccessScreen();                                             // 👉 y que sigamos en la pantalla de acceso
  cy.log("✅ La app se quedó en la pantalla de acceso (como debía).");        // 👉 confirmo
});

// Step igual pero con otro texto en el .feature
Then("debo ver un mensaje de error y no ingresar", () => {
  cy.log("❗ Verificando mensaje de error de acceso..."); // 👉 mismo propósito
  loginPage.expectAccessError();
  loginPage.expectAccessScreen();
  cy.log("✅ No entró a la app con credenciales inválidas.");
});

// ────────────────────────────────────────────────────────────────────
// LOGOUT
// ────────────────────────────────────────────────────────────────────

// Step: "When hago logout"
When("hago logout", () => {
  cy.log("🚪 Haciendo logout..."); // 👉 para que se sepa qué está pasando
  loginPage.logout();             // 👉 POM hace clic en el botón y valida que volvió al login
});

// Step: "Then debo regresar a la pantalla de acceso"
Then("debo regresar a la pantalla de acceso", () => {
  cy.log("👀 Verificando que volvimos a la pantalla de acceso..."); // 👉 explicación
  loginPage.expectAccessScreen();                                   // 👉 validación real
  cy.log("✅ Logout confirmado, estamos en la pantalla de acceso.");
});

// ────────────────────────────────────────────────────────────────────
// FACTURAS (UI)
// ────────────────────────────────────────────────────────────────────

// Step: "When creo una nueva factura válida"
When("creo una nueva factura válida", () => {
  // 👉 obtengo los datos de prueba desde env (pueden venir de GitHub Actions)
  const numero = Cypress.env("INVOICE_NUMBER");           // 👉 ej. FACTURA-CRIS
  const total = Cypress.env("INVOICE_TOTAL");             // 👉 ej. 100
  const estado = Cypress.env("INVOICE_STATUS") || "Vigente"; // 👉 por defecto "Vigente"

  cy.log(
    `🧾 Creando factura desde la UI con: número=${numero}, total=${total}, estado=${estado}`
  );

  // 👉 antes de hacer clic en "Crear" intercepto el POST que la app va a hacer
  cy.intercept("POST", "**/V1/invoices").as("createInvoice");

  // 👉 también intercepto el GET que la app hace después de crear (para refrescar la tabla)
  cy.intercept("GET", "**/V1/invoices?page=1**").as("listInvoicesAfterCreate");

  // 👉 ahora sí lleno el formulario usando el POM
  facturasPage.clickCrearNueva();         // 👉 abre el form
  facturasPage.fillNumeroFactura(numero); // 👉 escribe el número
  facturasPage.fillTotal(String(total));  // 👉 escribe el total
  facturasPage.selectEstado(estado);      // 👉 elige el estado (hacemos varios intentos dentro)
  facturasPage.submitCrear();             // 👉 envía el formulario

  cy.log("✅ Se envió el formulario de creación de factura."); // 👉 dejo constancia
});

// Step: "Then debo ver la factura creada en la lista con estado Vigente"
Then("debo ver la factura creada en la lista con estado Vigente", () => {
  // 👉 primero espero a que termine el POST que intercepté arriba
  cy.wait("@createInvoice").then((create) => {
    const body = create.response?.body || {}; // 👉 guardo el body que devolvió la API

    const createdId = body.id ?? body._id ?? null; // 👉 id puede venir como id o _id

    const createdNumber =
      body.invoiceNumber ||                         // 👉 camelCase
      body.invoice_number ||                        // 👉 snake_case
      (Cypress.env("INVOICE_NUMBER") as string);    // 👉 o me quedo con el que yo mandé

    const targetId = createdId ? String(createdId).trim() : "";       // 👉 normalizo id
    const targetNumber = String(createdNumber || "").trim().toLowerCase(); // 👉 normalizo número

    cy.log(`🆔 id creado por API: ${targetId || "(no vino)"}`); // 👉 lo muestro para debug
    cy.log(`🔎 número creado por API: ${targetNumber}`);        // 👉 lo muestro para debug

    // 👉 ahora espero a que la app pida de nuevo la lista
    cy.wait("@listInvoicesAfterCreate");

    // 👉 este es el selector real de la tabla de facturas
    const TABLE_ROWS_SELECTOR =
      "body > app-root > div > div > app-invoices > div.overflow-x-auto.mt-4 > table > tbody tr";

    cy.get(TABLE_ROWS_SELECTOR, { timeout: 15000 }) // 👉 espero a que haya filas
      .should(
        "have.length.greaterThan",
        0,
        "La tabla de facturas debe tener al menos 1 registro"
      )
      .then((rows) => {
        let found = false;         // 👉 bandera para saber si la encontramos
        const dump: string[] = []; // 👉 aquí guardo todas las filas para imprimirlas

        Array.from(rows).forEach((row) => {
          const rowText = (row.textContent || "").toLowerCase().trim(); // 👉 texto completo de la fila
          dump.push(rowText);                                           // 👉 la guardo para el log

          const matchById = targetId && rowText.includes(targetId);          // 👉 ¿esta fila contiene el id?
          const matchByNumber = targetNumber && rowText.includes(targetNumber); // 👉 ¿o contiene el número?
          const matchByStatus = rowText.includes("vigente");                 // 👉 ¿y dice "vigente"?

          if ((matchById || matchByNumber) && matchByStatus) { // 👉 si cumple id o número + estado
            found = true;                                      // 👉 ya la encontramos
          }
        });

        // 👉 imprimo todas las filas para que si falla sea fácil verlo
        cy.log("📋 Filas encontradas en la tabla:");
        cy.log("```text\n" + dump.join("\n---\n") + "\n```");
        // 👉 también a consola por si lo corremos headless
        // eslint-disable-next-line no-console
        console.log("📋 Filas de la tabla:", dump);

        expect(
          found,
          // 👉 mensaje pensado para alguien no técnico
          `❌ No se encontró en la tabla la factura recién creada (busqué por id="${targetId}" o número="${targetNumber}" y estado "Vigente"). Revisa si la API sí la devolvió en el listado.`
        ).to.be.true;

        if (found) {
          cy.log("✅ La factura recién creada SÍ aparece en la tabla con estado Vigente.");
        }
      });
  });
});

// Step: "When activo incluir facturas eliminadas y busco"
When("activo incluir facturas eliminadas y busco", () => {
  cy.log("🟣 Activando filtro 'Incluir facturas eliminadas' y ejecutando búsqueda..."); // 👉 dejo traza clara en el runner
  facturasPage.setIncludeDeletedAndSearch();                                            // 👉 delego al POM la lógica (marcar checkbox + clic en Buscar + esperar respuesta)
});

// Step: "Then deben mostrarse facturas eliminadas en los resultados"
Then("deben mostrarse facturas eliminadas en los resultados", () => {
  cy.log("👀 Buscando en el listado alguna factura marcada como eliminada..."); // 👉 explico qué voy a validar
  facturasPage.expectDeletedVisible();                                          // 👉 el POM busca textos tipo “Eliminada” o “Inactiva”
  cy.log("✅ Se encontraron facturas eliminadas en el resultado.");             // 👉 mensaje entendible para no dev
});

// Step: "When busco la factura por número"
When("busco la factura por número", () => {
  const num = Cypress.env("INVOICE_NUMBER");                    // 👉 tomo el número que definí en env (ej. FACTURA-CRIS)
  cy.log(`🔍 Buscando la factura por número: ${num}`);           // 👉 lo muestro en el log para saber qué se buscó
  facturasPage.searchByNumero(num);                             // 👉 POM hace: escribir en el filtro + clic en Buscar + esperar al GET
});

// Step: "Then debo ver FACTURA-CRIS en los resultados"
Then("debo ver FACTURA-CRIS en los resultados", () => {
  const num = Cypress.env("INVOICE_NUMBER");                    // 👉 mismo número que busqué
  facturasPage
    .rowByNumero(num)                                           // 👉 el POM localiza la fila de la tabla que contiene ese número
    .should(
      "exist",
      `Debo ver la fila con el número de factura "${num}"`
    )                                                           // 👉 si no existe, el mensaje le dice al tester qué esperaba
    .and(
      "be.visible",
      "La fila de esa factura debe mostrarse visible en la tabla"
    );                                                          // 👉 y además debe ser visible
  cy.log("✅ La factura buscada aparece en los resultados.");    // 👉 confirmación amigable
});

// Step: "When elimino la factura FACTURA-CRIS"
When("elimino la factura FACTURA-CRIS", () => {
  const num = Cypress.env("INVOICE_NUMBER");                    // 👉 número que quiero borrar
  cy.log(`🗑️ Eliminando la factura con número: ${num}`);         // 👉 dejo rastro de cuál fue
  facturasPage.deleteByNumero(num);                             // 👉 POM entra a la fila, clic en eliminar y confirma el modal
});

// Step: "Then la factura debe eliminarse o quedar con estado Eliminada"
Then("la factura debe eliminarse o quedar con estado Eliminada", () => {
  const num = Cypress.env("INVOICE_NUMBER");                    // 👉 misma factura que intenté borrar
  cy.log("👀 Verificando que la factura fue eliminada o quedó marcada como eliminada..."); // 👉 explicación para humanos
  facturasPage.expectDeletedOrAbsent(num);                      // 👉 POM valida: o ya no está, o la fila dice “Eliminada”
  cy.log("✅ La factura ya no aparece como vigente.");           // 👉 mensaje final simple
});