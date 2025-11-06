// cypress/pages/facturas.page.ts
// ====================================================================
// 📄 Page Object: FacturasPage
// --------------------------------------------------------------------
// Este archivo contiene la clase FacturasPage, que representa la pantalla
// de facturas dentro de la aplicación. Aquí se agrupan todas las acciones
// posibles: crear, buscar, eliminar o validar facturas.
//
// 👉 Así, los tests solo usan métodos como:
//    facturasPage.clickCrearNueva()
//    facturasPage.fillNumeroFactura(...)
//    facturasPage.submitCrear()
// En lugar de tener código repetido o con XPaths dentro de los step definitions.
// ====================================================================

// Se define una clase llamada FacturasPage
export class FacturasPage {

  // ------------------------------------------------------------------
  // (opcional) Método para navegar al módulo de facturas desde el menú principal.
  // ------------------------------------------------------------------
  goToModule() {
    cy.log("📂 Abriendo módulo de Facturas desde el menú…"); // 👉 Muestra en el panel de Cypress qué acción se ejecuta.
    cy.contains('a,button,[role="menuitem"]', /Facturas/i, { timeout: 10000 }).click(); // 👉 Busca un enlace o botón que diga “Facturas” (sin importar mayúsculas/minúsculas) y hace clic.
    cy.contains(/Facturas/i) // 👉 Espera que la palabra “Facturas” aparezca en pantalla.
      .should(
        "be.visible", // 👉 Verifica que sea visible.
        "✅ Se abrió la pantalla de facturas y el título es visible." // 👉 Mensaje explicativo para el log.
      );
  }

  // ================================================================
  // 🧾 SECCIÓN: CREAR FACTURA
  // ================================================================

  // Método para hacer clic en “Nueva factura”.
  clickCrearNueva() {
    cy.log("🆕 Voy a abrir el formulario para crear una factura…"); // 👉 Informa qué se está haciendo.

    const NEW_BTN_XPATH = '/html/body/app-root/div/div/app-invoices/div[1]/button'; // 👉 XPath exacto del botón “Nueva factura” en el DOM.

    cy.xpath(NEW_BTN_XPATH, { timeout: 10000 }) // 👉 Espera hasta 10 segundos a que el botón aparezca.
      .should("exist", "✅ Existe el botón de 'Nueva factura' en la pantalla.") // 👉 Verifica que exista.
      .and("be.visible", "✅ El botón de 'Nueva factura' está visible para hacer clic.") // 👉 Y que sea visible.
      .click({ force: true }); // 👉 Hace clic (force:true ignora si algo lo tapa).

    cy.get("#invoiceNumber", { timeout: 10000 }) // 👉 Espera a que aparezca el campo de número de factura.
      .should(
        "be.visible",
        "✅ Se abrió el formulario de factura (el campo 'Número de factura' está visible)." // 👉 Confirma que el formulario se abrió.
      );
  }

  // Método para llenar el campo “Número de factura”.
  fillNumeroFactura(numero: string) {
    cy.log(`✏️ Escribiendo número de factura: ${numero}`); // 👉 Registra en los logs el número que se escribirá.
    cy.get("#invoiceNumber", { timeout: 10000 }) // 👉 Busca el campo #invoiceNumber.
      .should("be.visible", "✅ El campo 'Número de factura' está disponible.") // 👉 Se asegura que sea visible.
      .clear() // 👉 Limpia cualquier texto previo.
      .type(numero); // 👉 Escribe el número que llega como parámetro.
  }

  // Método para llenar el campo “Total”.
  fillTotal(total: string) {
    cy.log(`💲 Escribiendo el total de la factura: ${total}`); // 👉 Muestra el total que se va a escribir.
    cy.get('input[name="total"], #total, input[placeholder*="Total"], input[type="number"]') // 👉 Busca el campo de total (hay varias posibles variantes).
      .first() // 👉 Toma el primero que encuentre.
      .should("be.visible", "✅ El campo de 'Total' está visible.") // 👉 Verifica que sea visible.
      .clear() // 👉 Limpia el campo.
      .type(total); // 👉 Escribe el total.
  }

  // Método para seleccionar el estado de la factura (“Vigente”, “Pagado”, etc.)
  selectEstado(estado: string) {
    cy.log(`📋 Intentando seleccionar el estado: "${estado}"…`); // 👉 Describe la acción en el log.

    // Paso 1: espera a que el select esté en el DOM.
    cy.get("#status", { timeout: 10000 })
      .should("exist", "✅ El selector de 'Estado' existe en el formulario.") // 👉 Verifica existencia.
      .and("be.visible", "✅ El selector de 'Estado' está visible."); // 👉 Verifica visibilidad.

    // Paso 2: espera que tenga al menos una opción.
    cy.get("#status option", { timeout: 10000 })
      .should("have.length.greaterThan", 0, "✅ El selector de 'Estado' tiene opciones para elegir.");

    // Paso 3: revisa qué opciones hay disponibles.
    cy.get("#status").then(($sel) => {
      const wanted = estado.trim(); // 👉 Quita espacios en blanco al inicio/final.
      const wantedLower = wanted.toLowerCase(); // 👉 Convierte a minúsculas para comparar sin errores.
      const options = Array.from($sel.find("option")); // 👉 Convierte las opciones del DOM a un arreglo normal.

      // Busca coincidencia por texto visible.
      const hasByText = options.some(
        (o) => (o.textContent || "").trim().toLowerCase() === wantedLower
      );

      // Busca coincidencia por atributo "value".
      const hasByValue = options.some(
        (o) => (o.getAttribute("value") || "").trim().toLowerCase() === wantedLower
      );

      // Paso 4: selecciona según lo que encuentre.
      if (hasByText) {
        cy.log("✅ Encontré la opción por TEXTO visible, la selecciono así.");
        cy.wrap($sel).select(wanted, { force: true });
      } else if (hasByValue) {
        cy.log("✅ Encontré la opción por VALUE, la selecciono así.");
        cy.wrap($sel).select(wantedLower, { force: true });
      } else {
        cy.log("⚠️ No encontré la opción exacta, usaré la segunda opción del select (fallback).");
        cy.wrap($sel)
          .find("option")
          .eq(1) // 👉 Selecciona la segunda opción (índice 1).
          .then(($opt) => {
            const val = $opt.attr("value") ?? $opt.text().trim(); // 👉 Usa el valor o texto.
            cy.wrap($sel).select(val, { force: true }); // 👉 Hace la selección.
          });
      }
    });

    // Paso 5: muestra cuál opción quedó seleccionada.
    cy.get("#status")
      .find("option:checked") // 👉 Toma la opción elegida.
      .invoke("text") // 👉 Obtiene su texto.
      .then((t) => {
        cy.log("📋 Estado seleccionado en el form:", t.trim()); // 👉 Lo imprime en los logs.
      });
  }

  // Método para hacer clic en el botón “Guardar” o “Crear factura”.
  submitCrear() {
    cy.log("💾 Enviando el formulario para crear/guardar la factura…");
    cy.contains("button, [type='submit']", /Crear factura|Guardar|Crear/i, { timeout: 10000 })
      .scrollIntoView() // 👉 Desplaza la pantalla hasta el botón.
      .should("exist", "✅ El botón para guardar la factura está presente.") // 👉 Verifica que existe.
      .and("be.visible", "✅ El botón para guardar la factura está visible.") // 👉 Verifica que se vea.
      .click({ force: true }); // 👉 Hace clic (force:true por seguridad).
  }

  // ================================================================
  // 🔎 MÉTODO: Buscar con “Incluir facturas eliminadas”
  // ================================================================
  setIncludeDeletedAndSearch() {
    cy.log("🗑️ Activando 'Incluir facturas eliminadas' y buscando…"); // 👉 Mensaje explicativo.

    cy.intercept("GET", "**/V1/invoices**", { times: 1 }).as("getInvoicesFiltered"); // 👉 Intercepta la petición GET para luego esperar su respuesta.

    cy.get("#showDeleted", { timeout: 10000 }) // 👉 Localiza el checkbox “Incluir facturas eliminadas”.
      .should("exist", "✅ El checkbox 'Incluir facturas eliminadas' existe.")
      .and("be.visible", "✅ El checkbox está visible.")
      .then(($cb) => {
        const checked = $cb.is(":checked"); // 👉 Revisa si ya está marcado.
        if (!checked) cy.wrap($cb).check({ force: true }); // 👉 Si no, lo marca.
      });

    const SEARCH_BTN_XPATH =
      "/html/body/app-root/div/div/app-invoices/div[2]/app-filter-form/div/div[2]/button[1]"; // 👉 XPath del botón Buscar.
    cy.xpath(SEARCH_BTN_XPATH, { timeout: 10000 })
      .should("exist", "✅ El botón 'Buscar' existe.")
      .and("be.visible", "✅ El botón 'Buscar' está visible.")
      .click({ force: true }); // 👉 Hace clic en Buscar.

    cy.wait("@getInvoicesFiltered", { timeout: 20000 }).then((i) => { // 👉 Espera la respuesta HTTP.
      const code = Number(i?.response?.statusCode); // 👉 Obtiene el código de estado.
      expect(
        code,
        "✅ La búsqueda con 'incluir eliminadas' respondió correctamente (código 2xx)."
      )
        .to.be.gte(200)
        .and.lt(300); // 👉 Valida que el status esté entre 200 y 299.
    });
  }

  // Método que valida que efectivamente se vean facturas eliminadas.
  expectDeletedVisible() {
    cy.log("🔍 Buscando en la tabla una factura que aparezca como eliminada/inactiva…");
    cy.contains(/Eliminad[oa]|Inactiv[oa]/i, { timeout: 10000 }) // 👉 Busca texto “Eliminada” o “Inactiva”.
      .should("exist", "✅ Se encontró al menos una factura marcada como eliminada/inactiva.");
  }

  // ================================================================
  // 🔍 MÉTODO: Buscar por número de factura
  // ================================================================
  searchByNumero(numero: string) {
    cy.log(`🔎 Buscando la factura con número: ${numero}`);
    cy.intercept("GET", "**/V1/invoices**", { times: 1 }).as("getInvoicesSearch"); // 👉 Intercepta búsqueda.
    cy.get('input[name="factura"], input[placeholder*="Factura"], input[type="text"]') // 👉 Busca el campo de búsqueda.
      .first()
      .clear()
      .type(numero); // 👉 Escribe el número.

    const SEARCH_BTN_XPATH =
      "/html/body/app-root/div/div/app-invoices/div[2]/app-filter-form/div/div[2]/button[1]"; // 👉 XPath del botón Buscar.
    cy.xpath(SEARCH_BTN_XPATH, { timeout: 10000 })
      .should("exist", "✅ El botón 'Buscar' existe.")
      .and("be.visible", "✅ El botón 'Buscar' está visible.")
      .click({ force: true }); // 👉 Clic en Buscar.

    cy.wait("@getInvoicesSearch", { timeout: 20000 }).then((i) => { // 👉 Espera la respuesta del backend.
      const code = Number(i?.response?.statusCode);
      expect(code, "✅ La búsqueda por número respondió correctamente.").to.be.gte(200).and.lt(300);
    });
  }

  // ================================================================
  // ⚙️ MÉTODOS: Utilidades sobre la tabla
  // ================================================================
  rowByNumero(numero: string) {
    return cy.contains("tr, .row, [role='row']", numero).first(); // 👉 Busca una fila (<tr>) que contenga el número de factura.
  }

  deleteByNumero(numero: string) {
    cy.log(`🗑️ Eliminando la factura con número: ${numero}`);
    this.rowByNumero(numero).within(() => { // 👉 Busca dentro de la fila específica.
      cy.get(
        'button[title="Eliminar factura"], .btn.btn-sm.btn-error[title="Eliminar factura"]' // 👉 Selecciona el botón eliminar dentro de esa fila.
      )
        .first()
        .click({ force: true }); // 👉 Hace clic en eliminar.
    });

    cy.get("button, [role='button']") // 👉 Busca el modal de confirmación.
      .contains(/Eliminar|Confirmar|Sí|Si/i) // 👉 Busca los botones típicos de confirmación.
      .then(($btn) => {
        if ($btn.length) cy.wrap($btn).click({ force: true }); // 👉 Si existe, confirma la eliminación.
      });
  }

  expectDeletedOrAbsent(numero: string) {
    cy.log(`✅ Verificando que la factura "${numero}" ya no esté disponible o esté marcada como eliminada…`);
    this.rowByNumero(numero).then(($row) => { // 👉 Busca si la fila sigue presente.
      if ($row && $row.length) {
        cy.wrap($row)
          .contains(/Eliminad[oa]/i) // 👉 Si sigue visible, debe decir “Eliminada”.
          .should("exist", "✅ La factura sigue en la tabla pero ya aparece como eliminada.");
      } else {
        cy.contains(numero) // 👉 Si ya no aparece el número…
          .should("not.exist", "✅ La factura ya no aparece en el listado (eliminada).");
      }
    });
  }
}

// Exporta una instancia de la clase FacturasPage lista para usar en los tests.
// Así puedes importar y usar directamente: facturasPage.clickCrearNueva(), etc.
export const facturasPage = new FacturasPage();