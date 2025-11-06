/ cypress/pages/login.page.ts
// ====================================================================
// 📄 Page Object: LoginPage
// --------------------------------------------------------------------
// Este archivo encapsula TODAS las acciones relacionadas con el login
// de la aplicación: abrir la pantalla, ingresar código, enviar el
// formulario, validar errores o éxito, y cerrar sesión.
//
// Así los tests solo escriben:
//   loginPage.visit()
//   loginPage.fillAccessCode("123")
//   loginPage.submit()
// …sin repetir selectores ni lógica en cada test.
// ====================================================================

import "cypress-xpath"; // 👉 Permite usar selectores XPath dentro de Cypress.

// ====================================================================
// 🔩 Selectores base de la pantalla de login
// ====================================================================
const LOGIN_PATH = "/";                 // 👉 URL donde vive el formulario de acceso.
const ACCESS_INPUT = "#access-code";    // 👉 Selector del input donde se escribe el código.
const SUBMIT_BTN = 'button[type="submit"]'; // 👉 Selector del botón “Entrar” o “Enviar”.

// 🔎 Selectores alternativos (data-testid), por si la app los implementa.
const DASHBOARD_SELECTOR = '[data-testid="dashboard"]';     // 👉 Contenedor del dashboard principal.
const ACCESS_ERROR_SELECTOR = '[data-testid="access-error"]'; // 👉 Contenedor del mensaje de error.

// ====================================================================
// Definición de la clase principal LoginPage
// ====================================================================
export class LoginPage {

  // --------------------------------------------------------------
  // 1️⃣ visitar la pantalla de login
  // --------------------------------------------------------------
  visit() {
    cy.log("📄 Abriendo la pantalla de acceso…"); // 👉 Muestra en el panel de Cypress lo que se está haciendo.
    cy.visit(LOGIN_PATH);                        // 👉 Abre la URL base del login ("/").
    cy.get(ACCESS_INPUT, { timeout: 15000 })     // 👉 Espera hasta 15 segundos a que aparezca el campo de código.
      .should("exist", "✅ El campo para escribir el código de acceso existe.") // 👉 Confirma que existe.
      .and("be.visible", "✅ El campo de código está visible.");                // 👉 Confirma que es visible.
  }

  // --------------------------------------------------------------
  // 2️⃣ escribir el código de acceso
  // --------------------------------------------------------------
  fillAccessCode(code: string) {
    cy.log(`✏️ Escribiendo el código de acceso: ${code}`); // 👉 Informa el valor que se escribirá.
    cy.get(ACCESS_INPUT, { timeout: 10000 })               // 👉 Busca el input del código.
      .scrollIntoView()                                   // 👉 Asegura que esté visible en pantalla.
      .should("be.visible", "✅ El campo de código está listo para escribir.") // 👉 Valida visibilidad.
      .clear()                                            // 👉 Limpia cualquier texto anterior.
      .type(code, { delay: 10 });                         // 👉 Escribe el código (con pequeño delay visual).
  }

  // --------------------------------------------------------------
  // 3️⃣A enviar el formulario sin esperar éxito (casos negativos)
  // --------------------------------------------------------------
  submit() {
    cy.log("📨 Enviando el formulario de acceso (sin esperar dashboard)…"); // 👉 Explica qué hace este método.
    cy.get(SUBMIT_BTN, { timeout: 10000 })             // 👉 Localiza el botón “Enviar”.
      .scrollIntoView()                               // 👉 Lo hace visible en pantalla.
      .should("exist", "✅ El botón de enviar existe.")// 👉 Verifica que el botón exista.
      .and("not.be.disabled", "✅ El botón de enviar no está deshabilitado.") // 👉 Que esté activo.
      .click({ force: true });                        // 👉 Hace clic (aunque haya overlays).
  }

  // --------------------------------------------------------------
  // 3️⃣B enviar esperando éxito (caso de login correcto)
  // --------------------------------------------------------------
  submitExpectSuccess() {
    cy.log("✅ Enviando el formulario y esperando la carga del dashboard…");

    // 👉 Intercepta la petición que hace la app después del login (GET /V1/invoices)
    cy.intercept("GET", "**/V1/invoices**", { times: 1 }).as("getInvoices");

    cy.get(SUBMIT_BTN, { timeout: 10000 })             // 👉 Busca el botón enviar.
      .scrollIntoView()
      .should("exist", "✅ El botón de enviar existe.")
      .and("be.visible", "✅ El botón de enviar está visible.")
      .click({ force: true });                         // 👉 Hace clic.

    // 👉 Espera la respuesta de la API y valida que sea exitosa (status 2xx)
    cy.wait("@getInvoices", { timeout: 20000 }).then((interception) => {
      const code = Number(interception?.response?.statusCode); // 👉 Extrae el código HTTP.
      if (!(code >= 200 && code < 300)) {                      // 👉 Si no está entre 200–299, lanza error.
        throw new Error(`❌ La app intentó cargar las facturas pero respondió ${code}`);
      }
      cy.log("📦 La app cargó las facturas después de hacer login."); // 👉 Log de confirmación.
    });

    // 👉 (opcional) aquí se podría agregar una validación visual del dashboard.
  }

  // --------------------------------------------------------------
  // 4️⃣ flujo rápido: login completo en una sola llamada
  // --------------------------------------------------------------
  loginWith(code: string) {
    cy.log("⚡ Login rápido con código directamente."); // 👉 Atajo para login directo.
    this.visit();                                     // 👉 Abre la pantalla.
    this.fillAccessCode(code);                        // 👉 Escribe el código.
    this.submit();                                   // 👉 Envía (sin esperar éxito).
  }

  // --------------------------------------------------------------
  // 5️⃣ validar que ya estoy dentro (dashboard visible)
  // --------------------------------------------------------------
expectDashboard() {  
  cy.log("🔎 Verificando que ya no estoy en la pantalla de acceso…");  
  // 👉 Muestra en el panel de ejecución de Cypress un mensaje descriptivo
  //     para que el tester sepa qué se está validando en este punto.

  // 👉 Paso 1: comprobar que el campo de login ya no existe.
  cy.get(ACCESS_INPUT).should(                // 👉 Busca el input del login (#access-code)
    "not.exist",                              // 👉 Espera que NO exista más en el DOM.
    "✅ Ya no se muestra el campo de acceso, lo cual indica login exitoso."
    // 👉 Mensaje de confirmación: si el input desaparece, significa que la app ya avanzó al dashboard.
  );

  // 👉 Paso 2: si la aplicación usa un atributo data-testid="dashboard", se valida visualmente.
  cy.get("body").then(($b) => {               // 👉 Accede al <body> completo de la página.
    if ($b.find(DASHBOARD_SELECTOR).length) { // 👉 Busca dentro del body el elemento con ese selector.
      cy.get(DASHBOARD_SELECTOR, { timeout: 10000 }) // 👉 Espera hasta 10s a que se muestre el dashboard.
        .should(                             
          "be.visible",                       // 👉 Comprueba que el contenedor principal se vea en pantalla.
          "✅ Se ve el contenedor principal del dashboard."
        );
      return; // 👉 Si se encontró y validó el dashboard, se sale del método aquí.
    }
  });

  // 👉 Paso 3: validación genérica (si la app no tiene data-testid específico)
  cy.get("table, [data-testid='invoices-list'], [role='table'], .grid, .list", {
    timeout: 10000,                           // 👉 Espera hasta 10 segundos a que aparezca algún contenido principal.
  }).should(
    "exist",                                  // 👉 Verifica que al menos un componente de contenido exista.
    "✅ Se ve contenido del dashboard (tabla/lista visible)." 
    // 👉 Este mensaje se muestra si se detecta una tabla, lista o grid.
  );
}

  // --------------------------------------------------------------
  // 6️⃣ validar error de acceso (cuando el código es inválido)
  // --------------------------------------------------------------
expectAccessError() {
  cy.log("🚫 Validando que la app mostró un error de acceso…");
  // 👉 Escribe en el panel de ejecución que vamos a revisar si la app
  //     mostró un mensaje de error al ingresar un código incorrecto.

  cy.get("body").then(($b) => {
    // 👉 Toma el cuerpo completo de la página (<body>) para analizar su contenido.

    // 👉 Si existe un elemento con data-testid="access-error", significa
    //     que la app muestra un contenedor especial para los errores de login.
    if ($b.find(ACCESS_ERROR_SELECTOR).length) {
      cy.get(ACCESS_ERROR_SELECTOR).should(
        "be.visible", // 👉 Verifica que el mensaje de error se esté mostrando.
        "✅ El mensaje de error de acceso está visible." // 👉 Mensaje de confirmación en los logs.
      );
    } else {
      // 👉 Si no hay un mensaje visible, revisamos si el campo de código
      //     quedó marcado como inválido (lo cual también indica error).

      cy.get(ACCESS_INPUT, { timeout: 8000 }) // 👉 Busca el input donde se escribe el código.
        .should("exist") // 👉 Confirma que el campo sigue existiendo.
        .and(($el) => {
          const el = $el[0] as HTMLInputElement; // 👉 Toma el primer elemento como objeto HTML nativo.

          // 👉 Algunas apps hechas con Angular agregan la clase "ng-invalid" al input cuando hay error.
          const hasNgInvalid = ($el.attr("class") || "").includes("ng-invalid");

          // 👉 Otras apps marcan el atributo aria-invalid="true" cuando hay error de validación.
          const ariaInvalid = el.getAttribute("aria-invalid") === "true";

          // 👉 Si el input NO tiene ninguno de esos indicadores, el test falla:
          //     quiere decir que ni se mostró mensaje ni se marcó el campo como erróneo.
          if (!hasNgInvalid && !ariaInvalid) {
            throw new Error("❌ No se encontró mensaje de error ni se marcó el input como inválido.");
          }
        });
    }
  });
}

  // --------------------------------------------------------------
  // 7️⃣ validar que sigo en la pantalla de login (no entró)
  // --------------------------------------------------------------
  expectAccessScreen() {
    cy.log("🟦 Confirmando que sigo en la pantalla de acceso…");
    cy.get(ACCESS_INPUT, { timeout: 8000 })                // 👉 Verifica que el input siga visible.
      .should("exist", "✅ El input de acceso sigue visible.")
      .and("be.visible");
    cy.get(DASHBOARD_SELECTOR).should(                     // 👉 Confirma que no se muestra el dashboard.
      "not.exist",
      "✅ No hay dashboard visible, sigo en el login."
    );
  }

  // --------------------------------------------------------------
  // 8️⃣ logout (cerrar sesión)
  // --------------------------------------------------------------
  logout() {
    cy.log("🚪 Cerrando sesión (logout)…");

    const LOGOUT_BTN_XPATH = "/html/body/app-root/div/div/div/button"; // 👉 XPath del botón de cerrar sesión.

    cy.xpath(LOGOUT_BTN_XPATH, { timeout: 10000 })          // 👉 Espera hasta que el botón exista.
      .should("exist", "✅ Existe el botón de cerrar sesión.") // 👉 Verifica existencia.
      .and("be.visible", "✅ El botón de cerrar sesión está visible.") // 👉 Y visibilidad.
      .click({ force: true });                              // 👉 Clic en “Cerrar sesión”.

    cy.get("#access-code", { timeout: 10000 }).should(      // 👉 Espera que reaparezca el input de acceso.
      "be.visible",
      "✅ Volvió a aparecer el campo de acceso; el logout funcionó correctamente."
    );
  }
}

// ====================================================================
// exportación
// ====================================================================
// 👉 Se exporta una instancia de la clase lista para usar en los step definitions.
//    Ejemplo de uso: loginPage.visit(), loginPage.logout(), etc.
export const loginPage = new LoginPage();