// cypress/pages/facturas.page.ts
// ====================================================================
// 📄 Page Object: FacturasPage
// --------------------------------------------------------------------
// Aquí concentro **todas** las acciones que puedo hacer en la pantalla
// de Facturas: abrir el módulo, crear una factura, buscar, marcar
// "incluir eliminadas", borrar y validar.
//
// La idea es que los step definitions solo digan:
//   facturasPage.clickCrearNueva()
//   facturasPage.fillNumeroFactura(...)
//   facturasPage.submitCrear()
// …y no tengan XPaths raros ahí.
// ====================================================================

export class FacturasPage {
  // ------------------------------------------------------------------
  // (opcional) Navegar al módulo de facturas desde el menú
  // ------------------------------------------------------------------
  goToModule() {
    cy.log("📂 Abriendo módulo de Facturas desde el menú…");
    cy.contains('a,button,[role="menuitem"]', /Facturas/i, { timeout: 10000 }).click();
    cy.contains(/Facturas/i)
      .should(
        "be.visible",
        "✅ Se abrió la pantalla de facturas y el título es visible."
      );
  }

  // ================================================================
  // 🧾 CREAR FACTURA
  // ================================================================

  // 1) abrir el formulario de nueva factura
  clickCrearNueva() {
    cy.log("🆕 Voy a abrir el formulario para crear una factura…");

    // este XPath es el que vimos en tu app real
    const NEW_BTN_XPATH = '/html/body/app-root/div/div/app-invoices/div[1]/button';

    cy.xpath(NEW_BTN_XPATH, { timeout: 10000 })
      .should("exist", "✅ Existe el botón de 'Nueva factura' en la pantalla.")
      .and("be.visible", "✅ El botón de 'Nueva factura' está visible para hacer clic.")
      .click({ force: true });

    // después de dar clic debería aparecer el form con #invoiceNumber
    cy.get("#invoiceNumber", { timeout: 10000 })
      .should(
        "be.visible",
        "✅ Se abrió el formulario de factura (el campo 'Número de factura' está visible)."
      );
  }

  // 2) llenar el número de factura
  fillNumeroFactura(numero: string) {
    cy.log(`✏️ Escribiendo número de factura: ${numero}`);
    cy.get("#invoiceNumber", { timeout: 10000 })
      .should("be.visible", "✅ El campo 'Número de factura' está disponible.")
      .clear()
      .type(numero);
  }

  // 3) llenar el total
  fillTotal(total: string) {
    cy.log(`💲 Escribiendo el total de la factura: ${total}`);
    cy.get('input[name="total"], #total, input[placeholder*="Total"], input[type="number"]')
      .first()
      .should("be.visible", "✅ El campo de 'Total' está visible.")
      .clear()
      .type(total);
  }

  // 4) seleccionar el estado
  selectEstado(estado: string) {
    cy.log(`📋 Intentando seleccionar el estado: "${estado}"…`);

    // 1) espero a que el select esté en el DOM y visible
    cy.get("#status", { timeout: 10000 })
      .should("exist", "✅ El selector de 'Estado' existe en el formulario.")
      .and("be.visible", "✅ El selector de 'Estado' está visible.");

    // 2) espero a que tenga al menos UNA opción
    cy.get("#status option", { timeout: 10000 }).should(
      "have.length.greaterThan",
      0,
      "✅ El selector de 'Estado' tiene opciones para elegir."
    );

    // 3) dentro del select veo qué opciones tiene
    cy.get("#status").then(($sel) => {
      const wanted = estado.trim(); // "Vigente"
      const wantedLower = wanted.toLowerCase();

      const options = Array.from($sel.find("option"));

      const hasByText = options.some(
        (o) => (o.textContent || "").trim().toLowerCase() === wantedLower
      );
      const hasByValue = options.some(
        (o) => (o.getAttribute("value") || "").trim().toLowerCase() === wantedLower
      );

      if (hasByText) {
        cy.log("✅ Encontré la opción por TEXTO visible, la selecciono así.");
        cy.wrap($sel).select(wanted, { force: true });
      } else if (hasByValue) {
        cy.log("✅ Encontré la opción por VALUE, la selecciono así.");
        cy.wrap($sel).select(wantedLower, { force: true });
      } else {
        cy.log(
          "⚠️ No encontré la opción exacta, usaré la segunda opción del select (fallback)."
        );
        cy.wrap($sel)
          .find("option")
          .eq(1)
          .then(($opt) => {
            const val = $opt.attr("value") ?? $opt.text().trim();
            cy.wrap($sel).select(val, { force: true });
          });
      }
    });

    // 4) log para ver qué quedó seleccionado
    cy.get("#status")
      .find("option:checked")
      .invoke("text")
      .then((t) => {
        cy.log("📋 Estado seleccionado en el form:", t.trim());
      });
  }

  // 5) enviar el formulario
  submitCrear() {
    cy.log("💾 Enviando el formulario para crear/guardar la factura…");
    cy.contains("button, [type='submit']", /Crear factura|Guardar|Crear/i, {
      timeout: 10000,
    })
      .scrollIntoView()
      .should("exist", "✅ El botón para guardar la factura está presente.")
      .and("be.visible", "✅ El botón para guardar la factura está visible.")
      .click({ force: true });
  }

  // ================================================================
  // 🔎 Buscar con “Incluir facturas eliminadas”
  // ================================================================
  setIncludeDeletedAndSearch() {
    cy.log("🗑️ Activando 'Incluir facturas eliminadas' y buscando…");

    cy.intercept("GET", "**/V1/invoices**", { times: 1 }).as("getInvoicesFiltered");

    cy.get("#showDeleted", { timeout: 10000 })
      .should("exist", "✅ El checkbox 'Incluir facturas eliminadas' existe.")
      .and("be.visible", "✅ El checkbox 'Incluir facturas eliminadas' está visible.")
      .then(($cb) => {
        const checked = $cb.is(":checked");
        if (!checked) cy.wrap($cb).check({ force: true });
      });

    const SEARCH_BTN_XPATH =
      "/html/body/app-root/div/div/app-invoices/div[2]/app-filter-form/div/div[2]/button[1]";
    cy.xpath(SEARCH_BTN_XPATH, { timeout: 10000 })
      .should("exist", "✅ El botón 'Buscar' existe.")
      .and("be.visible", "✅ El botón 'Buscar' está visible.")
      .click({ force: true });

    cy.wait("@getInvoicesFiltered", { timeout: 20000 }).then((i) => {
      const code = Number(i?.response?.statusCode);
      expect(
        code,
        "✅ La búsqueda con 'incluir eliminadas' respondió correctamente (código 2xx)."
      )
        .to.be.gte(200)
        .and.lt(300);
    });
  }

  // validar que efectivamente aparecieron facturas con estado eliminado/inactivo
  expectDeletedVisible() {
    cy.log("🔍 Buscando en la tabla una factura que aparezca como eliminada/inactiva…");
    cy.contains(/Eliminad[oa]|Inactiv[oa]/i, { timeout: 10000 }).should(
      "exist",
      "✅ Se encontró al menos una factura marcada como eliminada/inactiva."
    );
  }

  // ================================================================
  // 🔍 Búsqueda por número de factura
  // ================================================================
  searchByNumero(numero: string) {
    cy.log(`🔎 Buscando la factura con número: ${numero}`);

    cy.intercept("GET", "**/V1/invoices**", { times: 1 }).as("getInvoicesSearch");

    cy.get('input[name="factura"], input[placeholder*="Factura"], input[type="text"]')
      .first()
      .clear()
      .type(numero);

    const SEARCH_BTN_XPATH =
      "/html/body/app-root/div/div/app-invoices/div[2]/app-filter-form/div/div[2]/button[1]";
    cy.xpath(SEARCH_BTN_XPATH, { timeout: 10000 })
      .should("exist", "✅ El botón 'Buscar' existe.")
      .and("be.visible", "✅ El botón 'Buscar' está visible.")
      .click({ force: true });

    cy.wait("@getInvoicesSearch", { timeout: 20000 }).then((i) => {
      const code = Number(i?.response?.statusCode);
      expect(code, "✅ La búsqueda por número respondió correctamente.")
        .to.be.gte(200)
        .and.lt(300);
    });
  }

  // ================================================================
  // ⚙️ Utilidades sobre la tabla
  // ================================================================
  rowByNumero(numero: string) {
    return cy
      .contains("tr, .row, [role='row']", numero)
      .first();
  }

  deleteByNumero(numero: string) {
    cy.log(`🗑️ Eliminando la factura con número: ${numero}`);
    this.rowByNumero(numero).within(() => {
      cy.get(
        'button[title="Eliminar factura"], .btn.btn-sm.btn-error[title="Eliminar factura"]'
      )
        .first()
        .click({ force: true });
    });

    cy.get("button, [role='button']")
      .contains(/Eliminar|Confirmar|Sí|Si/i)
      .then(($btn) => {
        if ($btn.length) cy.wrap($btn).click({ force: true });
      });
  }

  expectDeletedOrAbsent(numero: string) {
    cy.log(
      `✅ Verificando que la factura "${numero}" ya no esté disponible o esté marcada como eliminada…`
    );
    this.rowByNumero(numero).then(($row) => {
      if ($row && $row.length) {
        cy.wrap($row)
          .contains(/Eliminad[oa]/i)
          .should("exist", "✅ La factura sigue en la tabla pero ya aparece como eliminada.");
      } else {
        cy.contains(numero).should(
          "not.exist",
          "✅ La factura ya no aparece en el listado (eliminada)."
        );
      }
    });
  }
}

// exporto la instancia lista para usar
export const facturasPage = new FacturasPage();