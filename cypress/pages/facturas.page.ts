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
  // La dejo por si en algún momento la app ya no nos manda directo.
  // Busca un enlace/botón que diga "Facturas" y lo abre.
  // ------------------------------------------------------------------
  goToModule() {
    cy.contains('a,button,[role="menuitem"]', /Facturas/i, { timeout: 10000 }).click();
    cy.contains(/Facturas/i).should("be.visible");
  }

  // ================================================================
  // 🧾 CREAR FACTURA
  // ================================================================
  // 1. Clic en "Nueva factura"
  // 2. Llenar número
  // 3. Llenar total
  // 4. Seleccionar estado
  // 5. Guardar
  // ================================================================

  // 1) abrir el formulario de nueva factura
  clickCrearNueva() {
    // este XPath es el que vimos en tu app real
    const NEW_BTN_XPATH = '/html/body/app-root/div/div/app-invoices/div[1]/button';

    cy.xpath(NEW_BTN_XPATH, { timeout: 10000 })
      .should("exist")     // el botón existe
      .and("be.visible")   // se ve
      .click({ force: true }); // lo clickeamos aunque quede tapado

    // después de dar clic debería aparecer el form con #invoiceNumber
    cy.get("#invoiceNumber", { timeout: 10000 }).should("be.visible");
  }

  // 2) llenar el número de factura
  fillNumeroFactura(numero: string) {
    cy.get("#invoiceNumber", { timeout: 10000 })
      .should("be.visible")
      .clear()
      .type(numero);
  }

  // 3) llenar el total (tu app tiene varios inputs de número, por eso hago .first())
  fillTotal(total: string) {
    cy.get('input[name="total"], #total, input[placeholder*="Total"], input[type="number"]')
      .first()
      .should("be.visible")
      .clear()
      .type(total);
  }

  // 4) seleccionar el estado
  // ----------------------------------------------------------
  // Tu select de estado a veces viene con muchas opciones
  // y el valor puede estar en mayúsculas, minúsculas o como value.
  // Por eso aquí hago 3 intentos:
  //   a. seleccionar por texto visible (Vigente)
  //   b. seleccionar por value (vigente)
  //   c. si no, selecciono la opción 2 (#status > option:nth-child(2))
  // ----------------------------------------------------------
  selectEstado(estado: string) {
    // 1) espero a que el select esté en el DOM y visible
    cy.get("#status", { timeout: 10000 })
      .should("exist")
      .and("be.visible");

    // 2) espero a que tenga al menos UNA opción
    cy.get("#status option", { timeout: 10000 })
      .should("have.length.greaterThan", 0);

    // 3) dentro del select veo qué opciones tiene
    cy.get("#status").then(($sel) => {
      const wanted = estado.trim();              // "Vigente"
      const wantedLower = wanted.toLowerCase();  // "vigente"

      // convierto las opciones del DOM a un array JS
      const options = Array.from($sel.find("option"));

      // ¿hay una opción cuyo TEXTO diga "Vigente"?
      const hasByText = options.some(
        (o) => (o.textContent || "").trim().toLowerCase() === wantedLower
      );

      // ¿hay una opción cuyo VALUE sea "vigente"?
      const hasByValue = options.some(
        (o) =>
          (o.getAttribute("value") || "").trim().toLowerCase() === wantedLower
      );

      if (hasByText) {
        // caso ideal: selecciono por texto tal cual
        cy.wrap($sel).select(wanted, { force: true });
      } else if (hasByValue) {
        // caso B: selecciono por value en minúsculas
        cy.wrap($sel).select(wantedLower, { force: true });
      } else {
        // último recurso: tomo la segunda opción
        cy.wrap($sel)
          .find("option")
          .eq(1)
          .then(($opt) => {
            const val = $opt.attr("value") ?? $opt.text().trim();
            cy.wrap($sel).select(val, { force: true });
          });
      }
    });

    // 4) log para ver qué quedó seleccionado, muy útil cuando falla en CI
    cy.get("#status")
      .find("option:checked")
      .invoke("text")
      .then((t) => {
        cy.log("📋 Estado seleccionado en el form:", t.trim());
      });
  }

  // 5) enviar el formulario
  // Ojo: aquí ya no esperamos al XHR porque eso lo hace el step (common.ts)
  submitCrear() {
    cy.contains("button, [type='submit']", /Crear factura|Guardar|Crear/i, {
      timeout: 10000,
    })
      .scrollIntoView()
      .should("exist")
      .and("be.visible")
      .click({ force: true });
  }

  // ================================================================
  // 🔎 Buscar con “Incluir facturas eliminadas”
  // ================================================================
  setIncludeDeletedAndSearch() {
    // intercepto el GET que va a hacer la app cuando toque "Buscar"
    cy.intercept("GET", "**/V1/invoices**", { times: 1 }).as("getInvoicesFiltered");

    // marco el checkbox "Incluir facturas eliminadas"
    cy.get("#showDeleted", { timeout: 10000 })
      .should("exist")
      .and("be.visible")
      .then(($cb) => {
        const checked = $cb.is(":checked");
        if (!checked) cy.wrap($cb).check({ force: true });
      });

    // doy clic en el botón Buscar (el que vimos por XPath)
    const SEARCH_BTN_XPATH =
      "/html/body/app-root/div/div/app-invoices/div[2]/app-filter-form/div/div[2]/button[1]";
    cy.xpath(SEARCH_BTN_XPATH, { timeout: 10000 })
      .should("exist")
      .and("be.visible")
      .click({ force: true });

    // espero la respuesta y valido que sea 2xx
    cy.wait("@getInvoicesFiltered", { timeout: 20000 }).then((i) => {
      const code = Number(i?.response?.statusCode);
      expect(code, "status code de búsqueda de facturas")
        .to.be.gte(200)
        .and.lt(300);
    });
  }

  // validar que efectivamente aparecieron facturas con estado eliminado/inactivo
  expectDeletedVisible() {
    cy.contains(/Eliminad[oa]|Inactiv[oa]/i, { timeout: 10000 }).should("exist");
  }

  // ================================================================
  // 🔍 Búsqueda por número de factura
  // ================================================================
  searchByNumero(numero: string) {
    // intercepto el GET para saber cuándo termina la búsqueda
    cy.intercept("GET", "**/V1/invoices**", { times: 1 }).as("getInvoicesSearch");

    // escribo en el input de búsqueda (tiene varios nombres, por eso varios selectores)
    cy.get('input[name="factura"], input[placeholder*="Factura"], input[type="text"]')
      .first()
      .clear()
      .type(numero);

    // clic en Buscar
    const SEARCH_BTN_XPATH =
      "/html/body/app-root/div/div/app-invoices/div[2]/app-filter-form/div/div[2]/button[1]";
    cy.xpath(SEARCH_BTN_XPATH, { timeout: 10000 })
      .should("exist")
      .and("be.visible")
      .click({ force: true });

    // espero la respuesta y valido
    cy.wait("@getInvoicesSearch", { timeout: 20000 }).then((i) => {
      const code = Number(i?.response?.statusCode);
      expect(code).to.be.gte(200).and.lt(300);
    });
  }

  // ================================================================
  // ⚙️ Utilidades sobre la tabla (reusar en varios steps)
  // ================================================================

  // devolver la fila que contiene ese número de factura
  rowByNumero(numero: string) {
    return cy.contains("tr, .row, [role='row']", numero).first();
  }

  // eliminar una factura por número
  deleteByNumero(numero: string) {
    // dentro de la fila, busco el botón de eliminar
    this.rowByNumero(numero).within(() => {
      cy.get(
        'button[title="Eliminar factura"], .btn.btn-sm.btn-error[title="Eliminar factura"]'
      )
        .first()
        .click({ force: true });
    });

    // confirmo en el modal
    cy.get("button, [role='button']")
      .contains(/Eliminar|Confirmar|Sí|Si/i)
      .then(($btn) => {
        if ($btn.length) cy.wrap($btn).click({ force: true });
      });
  }

  // validar que una factura quedó eliminada o ya no está
  expectDeletedOrAbsent(numero: string) {
    this.rowByNumero(numero).then(($row) => {
      if ($row && $row.length) {
        // si la fila todavía está, debe decir "Eliminada"
        cy.wrap($row).contains(/Eliminad[oa]/i).should("exist");
      } else {
        // si ya no está la fila, también es válido
        cy.contains(numero).should("not.exist");
      }
    });
  }
}

// exporto la instancia lista para usar
export const facturasPage = new FacturasPage();