// cypress/e2e/step_definitions/invoices.api.steps.ts
// ====================================================================
// 🧪 Steps de Cucumber para probar directamente el API de facturas.
// --------------------------------------------------------------------
// Aquí NO tocamos la UI, solo hacemos cy.request(...) al API real.
//
// Flujo:
//  1. El feature dice cuál es el basePath.
//  2. El feature pasa un JSON con el payload.
//  3. Aquí hacemos GET/POST/PUT/DELETE.
//  4. Guardamos la respuesta en un "ctx" compartido.
//  5. Los Then leen ese ctx y validan status/body.
//  6. Todo lo dejamos logueado bonito para entenderlo rápido.
// ====================================================================

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"; // steps de cucumber
import { expect } from "chai";                                                // assertions

// ================== Tipos ==================
// Solo para tener tipado el body cuando "creamos" una factura desde el feature.
type CreateReq = {
  invoice_number: string;
  total: number;
  invoice_date: string;
  status: string;
  active: boolean;
};

// ================== Contexto compartido ==================
// Esto vive solo durante el escenario actual.
// Lo usamos para pasar info del Given → When → Then.
const ctx: {
  basePath?: string;
  reqBody?: any;
  resp?: Cypress.Response;
} = {};

// ================== Helpers de logging ==================
// Los hago bonitos porque en Cypress el log se ve en la UI y ayuda mucho.

const logTitle = (text: string) => {
  const line = "─".repeat(Math.max(30, text.length + 4));
  // consola
  // eslint-disable-next-line no-console
  console.log(`\n${line}\n🔎 ${text}\n${line}`);
  // panel de Cypress
  cy.log(`**${text}**`);
};

const logJSON = (label: string, obj: unknown) => {
  cy.log(`${label}:`);
  cy.log("```json\n" + JSON.stringify(obj, null, 2) + "\n```");
  // eslint-disable-next-line no-console
  console.log(label + ":", obj);
};

// ====================================================================
// BACKGROUND
// ====================================================================

// Given el basePath de la API es "/V1/invoices"
Given("el basePath de la API es {string}", (path: string) => {
  ctx.basePath = path;
  logTitle(`Base path configurado: ${ctx.basePath}`);
});

// ====================================================================
// BUILDERS (los que cargan el JSON del feature)
// ====================================================================

// Given el payload de creación es:
//   """ { ... } """
Given("el payload de creación es:", (docString: string) => {
  ctx.reqBody = JSON.parse(docString) as CreateReq;
  logJSON("📦 Payload de creación recibido", ctx.reqBody);
});

// Given el payload de actualización es:
//   """ { ... } """
Given("el payload de actualización es:", (docString: string) => {
  ctx.reqBody = JSON.parse(docString);
  logJSON("📝 Payload de actualización recibido", ctx.reqBody);
});

// ====================================================================
// WHEN (acciones HTTP reales)
// ====================================================================

// ---------------------
// GET con token (caso feliz)
// ---------------------
When("hago GET a {string} con token", (rawUrl: string) => {
  const apiBase = Cypress.env("API_BASE_URL") as string;
  const url = `${apiBase}${rawUrl}`;
  const started = Date.now();

  cy.log(`🌐 GET (con token) → ${url}`);

  cy.request({
    method: "GET",
    url,
    headers: { Authorization: Cypress.env("AUTH_TOKEN") as string },
  }).then((resp) => {
    const ms = Date.now() - started;
    ctx.resp = resp;
    logTitle(`✅ GET con token: ${url} (${ms} ms)`);
    logJSON("📥 Respuesta", resp.body);
  });
});

// ---------------------
// GET sin token (con opción de permitir 4xx)
// ---------------------
// Acepta:
//   When hago GET a "/V1/invoices" sin token
//   When hago GET a "/V1/invoices" sin token (permitiendo 4xx)
When(
  /^hago GET a "([^"]+)" sin token(?: \(permitiendo 4xx\))?$/,
  (rawUrl: string) => {
    const apiBase = Cypress.env("API_BASE_URL") as string;
    const url = `${apiBase}${rawUrl}`;
    const started = Date.now();

    cy.log(`🌐 GET (sin token) → ${url}`);

    cy.request({
      method: "GET",
      url,
      failOnStatusCode: false, // no truena en 401/403 porque es justo lo que queremos ver
    }).then((resp) => {
      const ms = Date.now() - started;
      ctx.resp = resp;
      logTitle(`ℹ️ GET sin token: ${url} (${ms} ms)`);
      logJSON("📥 Respuesta", resp.body);
    });
  }
);

// ---------------------
// POST con payload y token
// ---------------------
// Acepta las 2 variantes:
//   When hago POST a "/V1/invoices" con ese payload y token
//   When hago POST a "/V1/invoices" con ese payload y token (permitiendo 4xx)
When(
  /^hago POST a "([^"]+)" con ese payload y token(?: \(permitiendo 4xx\))?$/,
  (rawUrl: string, _allow4xx?: string) => {
    const apiBase = Cypress.env("API_BASE_URL") as string;
    const url = `${apiBase}${rawUrl}`;
    const started = Date.now();
    // si el step decía "(permitiendo 4xx)" entonces NO quiero que cypress falle
    const failOnStatusCode = !_allow4xx;

    cy.log(`📤 POST → ${url}`);
    cy.log("📦 Enviando el payload que armamos en el Given…");

    cy.request({
      method: "POST",
      url,
      headers: {
        Authorization: Cypress.env("AUTH_TOKEN") as string,
        "Content-Type": "application/json",
      },
      body: ctx.reqBody,
      failOnStatusCode,
    }).then((resp) => {
      const ms = Date.now() - started;
      ctx.resp = resp;
      logTitle(`✅ POST: ${url} (${ms} ms)`);
      logJSON("📥 Respuesta", resp.body);

      // 🧪 regla especial: si mandamos total < 0, esperamos 422
      if (
        ctx.reqBody &&
        typeof ctx.reqBody.total === "number" &&
        ctx.reqBody.total < 0
      ) {
        cy.log("🧪 Caso negativo detectado (total < 0), espero 422 del API…");
        expect(resp.status, "el API debe responder 422 cuando el total es negativo")
          .to.eq(422);
        if (resp.body && typeof resp.body === "object") {
          expect(resp.body, "el cuerpo debe traer la propiedad 'error'")
            .to.have.property("error");
        }
      }
    });
  }
);

// ---------------------
// DELETE con token
// ---------------------
When(
  /^hago DELETE a "([^"]+)" con token(?: \(permitiendo 4xx\))?$/,
  (rawUrl: string, _allow4xx?: string) => {
    const apiBase = Cypress.env("API_BASE_URL") as string;
    const url = `${apiBase}${rawUrl}`;
    const started = Date.now();
    const failOnStatusCode = !_allow4xx;

    cy.log(`🗑️ DELETE → ${url}`);

    cy.request({
      method: "DELETE",
      url,
      headers: { Authorization: Cypress.env("AUTH_TOKEN") as string },
      failOnStatusCode,
    }).then((resp) => {
      const ms = Date.now() - started;
      ctx.resp = resp;
      logTitle(`✅ DELETE: ${url} (${ms} ms)`);
      logJSON("📥 Respuesta", resp.body);
    });
  }
);

// ---------------------
// PUT con token
// ---------------------
When(
  /^hago PUT a "([^"]+)" con ese payload y token(?: \(permitiendo 4xx\))?$/,
  (rawUrl: string, _allow4xx?: string) => {
    const apiBase = Cypress.env("API_BASE_URL") as string;
    const url = `${apiBase}${rawUrl}`;
    const started = Date.now();
    const failOnStatusCode = !_allow4xx;

    cy.log(`📝 PUT → ${url}`);

    cy.request({
      method: "PUT",
      url,
      headers: {
        Authorization: Cypress.env("AUTH_TOKEN") as string,
        "Content-Type": "application/json",
      },
      body: ctx.reqBody,
      failOnStatusCode,
    }).then((resp) => {
      const ms = Date.now() - started;
      ctx.resp = resp;
      logTitle(`✅ PUT: ${url} (${ms} ms)`);
      logJSON("📥 Respuesta", resp.body);
    });
  }
);

// ====================================================================
// THEN (validaciones)
// ====================================================================

// Then la respuesta debe tener status 200
Then("la respuesta debe tener status {int}", (status: number) => {
  expect(ctx.resp, "❌ No hay respuesta HTTP guardada en el contexto.").to.exist;
  expect(ctx.resp!.status, "❌ El código de estado no coincide.")
    .to.eq(status);
});

// Then la respuesta debe tener status en [400, 422]
Then("la respuesta debe tener status en [{int}, {int}]", (s1: number, s2: number) => {
  expect(ctx.resp, "❌ No hay respuesta HTTP guardada en el contexto.").to.exist;
  expect([s1, s2], "❌ El status no está en el rango esperado.")
    .to.include(ctx.resp!.status);
});

// Then el cuerpo debe incluir un arreglo "invoices"
Then("el cuerpo debe incluir un arreglo {string}", (prop: string) => {
  expect(ctx.resp!.body, "❌ La respuesta no tiene body.").to.have.property(prop);
  expect(
    Array.isArray(ctx.resp!.body[prop]),
    `❌ La propiedad ${prop} existe pero no es un arreglo.`
  ).to.eq(true);
});

// Then si "invoices" tiene elementos, el primero debe tener:
Then(
  'si "invoices" tiene elementos, el primero debe tener:',
  (table: { raw: () => string[][] }) => {
    const rows = table.raw();
    const list = ctx.resp!.body.invoices as any[];

    if (!Array.isArray(list) || list.length === 0) {
      cy.log("ℹ️ 'invoices' vino vacío; no se hace validación de campos.");
      return;
    }

    const first = list[0];

    rows.forEach(([key, expected]) => {
      let expectedVal: any = expected;
      if (expected === "true") expectedVal = true;
      if (expected === "false") expectedVal = false;

      expect(first, "❌ El primer elemento no trae el campo esperado.")
        .to.have.property(key);
      expect(first[key], `❌ El campo ${key} no coincide con lo esperado.`)
        .to.eq(expectedVal);
    });
  }
);

// Then la respuesta debe reflejar los campos del payload tolerante a camelCase o snake_case
Then(
  "la respuesta debe reflejar los campos del payload tolerante a camelCase o snake_case",
  () => {
    const req = ctx.reqBody;
    const res = ctx.resp!.body;

    // tomamos la forma que haya venido
    const returnedNumber = res.invoice_number ?? res.invoiceNumber;
    const returnedDate   = res.invoice_date   ?? res.invoiceDate;
    const returnedTotal  = res.total;
    const returnedStatus = res.status;
    const returnedActive = res.active;

    expect(returnedNumber, "❌ El número de factura no coincide.")
      .to.eq(req.invoice_number);
    expect(returnedDate, "❌ La fecha no coincide.").to.eq(req.invoice_date);
    expect(returnedTotal, "❌ El total no coincide.").to.eq(req.total);
    expect(returnedStatus, "❌ El estado no coincide.").to.eq(req.status);
    expect(returnedActive, "❌ El campo 'active' no coincide.").to.eq(req.active);
  }
);

// Then el cuerpo debe tener la propiedad "error" con valor "Factura no encontrada"
Then(
  'el cuerpo debe tener la propiedad {string} con valor {string}',
  (prop: string, val: string) => {
    expect(ctx.resp!.body, "❌ La respuesta no tiene body.").to.have.property(
      prop,
      val
    );
  }
);