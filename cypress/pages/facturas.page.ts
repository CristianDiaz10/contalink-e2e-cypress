// cypress/pages/facturas.page.ts
export class FacturasPage {
  // Ir al módulo (opcional)
  goToModule() {
    cy.contains('a,button,[role="menuitem"]', /Facturas/i, { timeout: 10000 }).click();
    cy.contains(/Facturas/i).should("be.visible");
  }

  /* =========================
   * Crear factura
   * ========================= */
  clickCrearNueva() {
    const NEW_BTN_XPATH = '/html/body/app-root/div/div/app-invoices/div[1]/button';

    cy.xpath(NEW_BTN_XPATH, { timeout: 10000 })
      .should("exist")
      .and("be.visible")
      .click({ force: true });

    // Form abierto
    cy.get("#invoiceNumber", { timeout: 10000 }).should("be.visible");
  }

  fillNumeroFactura(numero: string) {
    cy.get("#invoiceNumber", { timeout: 10000 })
      .should("be.visible")
      .clear()
      .type(numero);
  }

  fillTotal(total: string) {
    cy.get('input[name="total"], #total, input[placeholder*="Total"], input[type="number"]')
      .first()
      .should("be.visible")
      .clear()
      .type(total);
  }

  /**
   * Selecciona el estado en el select del formulario.
   * Hace varios intentos: por texto, por value y por índice.
   */
  selectEstado(estado: string) {
  // 1) espera a que el select esté en el DOM y visible
  cy.get("#status", { timeout: 10000 })
    .should("exist")
    .and("be.visible");

  // 2) espera a que tenga al menos 1 opción
  cy.get("#status option", { timeout: 10000 })
    .should("have.length.greaterThan", 0);

  // 3) intenta seleccionar por texto; si no, por value en minúsculas
  cy.get("#status").then(($sel) => {
    const wanted = estado.trim();
    const wantedLower = wanted.toLowerCase();

    const options = Array.from($sel.find("option"));
    const hasByText = options.some(
      (o) => (o.textContent || "").trim().toLowerCase() === wantedLower
    );
    const hasByValue = options.some(
      (o) => ((o.getAttribute("value") || "").trim().toLowerCase() === wantedLower)
    );

    if (hasByText) {
      cy.wrap($sel).select(wanted, { force: true });
    } else if (hasByValue) {
      cy.wrap($sel).select(wantedLower, { force: true });
    } else {
      // fallback: toma la segunda opción (#status > option:nth-child(2))
      cy.wrap($sel)
        .find("option")
        .eq(1)
        .then(($opt) => {
          const val = $opt.attr("value") ?? $opt.text().trim();
          cy.wrap($sel).select(val, { force: true });
        });
    }
  });

  // 4) log chiquito para ver qué quedó
  cy.get("#status")
    .find("option:checked")
    .invoke("text")
    .then((t) => {
      cy.log("📋 Estado seleccionado en el form:", t.trim());
    });
}
  submitCrear() {
    // ⚠️ aquí ya NO interceptamos ni esperamos
    // eso lo hace el step para no duplicar waits
    cy.contains("button, [type='submit']", /Crear factura|Guardar|Crear/i, {
      timeout: 10000,
    })
      .scrollIntoView()
      .should("exist")
      .and("be.visible")
      .click({ force: true });
  }

  /* =========================
   * Buscar con "Incluir facturas eliminadas"
   * ========================= */
  setIncludeDeletedAndSearch() {
    cy.intercept("GET", "**/V1/invoices**", { times: 1 }).as("getInvoicesFiltered");

    cy.get("#showDeleted", { timeout: 10000 })
      .should("exist")
      .and("be.visible")
      .then(($cb) => {
        const checked = $cb.is(":checked");
        if (!checked) cy.wrap($cb).check({ force: true });
      });

    const SEARCH_BTN_XPATH =
      "/html/body/app-root/div/div/app-invoices/div[2]/app-filter-form/div/div[2]/button[1]";
    cy.xpath(SEARCH_BTN_XPATH, { timeout: 10000 })
      .should("exist")
      .and("be.visible")
      .click({ force: true });

    cy.wait("@getInvoicesFiltered", { timeout: 20000 }).then((i) => {
      const code = Number(i?.response?.statusCode);
      expect(code, "status code de búsqueda de facturas").to.be.gte(200).and.lt(300);
    });
  }

  expectDeletedVisible() {
    cy.contains(/Eliminad[oa]|Inactiv[oa]/i, { timeout: 10000 }).should("exist");
  }

  /* =========================
   * Búsqueda por número
   * ========================= */
  searchByNumero(numero: string) {
    cy.intercept("GET", "**/V1/invoices**", { times: 1 }).as("getInvoicesSearch");

    cy.get('input[name="factura"], input[placeholder*="Factura"], input[type="text"]')
      .first()
      .clear()
      .type(numero);

    const SEARCH_BTN_XPATH =
      "/html/body/app-root/div/div/app-invoices/div[2]/app-filter-form/div/div[2]/button[1]";
    cy.xpath(SEARCH_BTN_XPATH, { timeout: 10000 })
      .should("exist")
      .and("be.visible")
      .click({ force: true });

    cy.wait("@getInvoicesSearch", { timeout: 20000 }).then((i) => {
      const code = Number(i?.response?.statusCode);
      expect(code).to.be.gte(200).and.lt(300);
    });
  }

  /* =========================
   * Utilidades tabla/listado
   * ========================= */
  rowByNumero(numero: string) {
    return cy.contains("tr, .row, [role='row']", numero).first();
  }

  deleteByNumero(numero: string) {
    this.rowByNumero(numero).within(() => {
      cy.get('button[title="Eliminar factura"], .btn.btn-sm.btn-error[title="Eliminar factura"]')
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
    this.rowByNumero(numero).then(($row) => {
      if ($row && $row.length) {
        cy.wrap($row).contains(/Eliminad[oa]/i).should("exist");
      } else {
        cy.contains(numero).should("not.exist");
      }
    });
  }
}

export const facturasPage = new FacturasPage();