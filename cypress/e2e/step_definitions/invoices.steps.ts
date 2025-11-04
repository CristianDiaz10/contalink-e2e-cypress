// cypress/e2e/step_definitions/invoices.api.steps.ts (por ejemplo)
// ====================================================================
// Steps de Cucumber para probar directamente el API de facturas.
// Aquí NO tocamos la UI, solo hacemos cy.request(...) al API real.
//
// Lo que hace este archivo:
//  - lee el basePath que viene en el feature (ej. "/V1/invoices")
//  - construye el payload que el feature pone en el docstring
//  - llama GET/POST/PUT/DELETE al endpoint real
//  - guarda la última respuesta en un contexto (ctx) para que los Then
//    puedan validarla después
//  - imprime en consola y en el panel de Cypress el body para que sea legible
// ====================================================================

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"; // steps de cucumber
import { expect } from "chai";                                                // assertions

// ================== Tipos ==================
// Esto es solo para tener tipado el payload que vamos a mandar en los POST/PUT.
type CreateReq = {
  invoice_number: string;  // número de factura (snake_case)
  total: number;           // total de la factura
  invoice_date: string;    // fecha como viene en tus ejemplos "16/07/2025 10:01 PM"
  status: string;          // "Vigente", "Pagado", etc.
  active: boolean;         // true/false
};

// ================== Contexto compartido ==================
// Aquí guardo cosas entre steps del mismo escenario.
// OJO: esto vive en memoria solo durante ese escenario.
const ctx: {
  basePath?: string;         // ej. "/V1/invoices" que viene del Given
  reqBody?: any;             // el último payload que armamos (POST/PUT)
  resp?: Cypress.Response;   // la última respuesta HTTP que recibimos
} = {};

// ================== Helpers de logging ==================
// Los hago bonitos porque alguien que no es QA lo va a leer.

const logTitle = (text: string) => {
  const line = "─".repeat(Math.max(30, text.length + 4));
  // consola
  // eslint-disable-next-line no-console
  console.log(`\n${line}\n🔎 ${text}\n${line}`);
  // panel de Cypress
  cy.log(`**${text}**`);
};

const logJSON = (label: string, obj: unknown) => {
  // lo mando al panel de Cypress como bloque de código
  cy.log(`${label}:`);
  cy.log("```json\n" + JSON.stringify(obj, null, 2) + "\n```");
  // y también a la consola
  // eslint-disable-next-line no-console
  console.log(label + ":", obj);
};

// ================== Background ==================
// Este step suele venir en el Background del feature
// "Given el basePath de la API es "/V1/invoices""
Given("el basePath de la API es {string}", (path: string) => {
  ctx.basePath = path;                          // lo guardo para usarlo luego
  logTitle(`Base path configurado: ${ctx.basePath}`);
});

// ================== Builders ==================
// Estos steps son los que reciben el JSON de los features y lo guardan en ctx.

// "Given el payload de creación es:"  + docstring
Given("el payload de creación es:", (docString: string) => {
  ctx.reqBody = JSON.parse(docString) as CreateReq;    // parseo el JSON literal del feature
  logJSON("Payload de creación", ctx.reqBody);
});

// "Given el payload de actualización es:"  + docstring
Given("el payload de actualización es:", (docString: string) => {
  ctx.reqBody = JSON.parse(docString);                 // aquí no tipamos porque puede variar
  logJSON("Payload de actualización", ctx.reqBody);
});

// ================== When (HTTP actions) ==================
// Aquí es donde pego realmente contra el API.

// GET con token (feliz)
When("hago GET a {string} con token", (rawUrl: string) => {
  // la base del API la saco de cypress.config.ts → env.API_BASE_URL
  const apiBase = Cypress.env("API_BASE_URL") as string; // ej. https://candidates-api.contalink.com
  const url = `${apiBase}${rawUrl}`;                     // junto la base con lo que vino en el feature
  const started = Date.now();                            // para medir ms

  cy.request({
    method: "GET",
    url,
    headers: { Authorization: Cypress.env("AUTH_TOKEN") as string }, // header con el token
  }).then((resp) => {
    const ms = Date.now() - started;                     // tiempo de respuesta
    ctx.resp = resp;                                     // guardo la respuesta para los Then
    logTitle(`GET con token: ${url} (${ms} ms)`);        // título bonito
    logJSON("Respuesta", resp.body);                     // body formateado
  });
});

// GET sin token (versión flexible que acepta " (permitiendo 4xx)")
// uso un regex para aceptar las dos formas
When(
  /^hago GET a "([^"]+)" sin token(?: \(permitiendo 4xx\))?$/,
  (rawUrl: string) => {
    const apiBase = Cypress.env("API_BASE_URL") as string;
    const url = `${apiBase}${rawUrl}`;
    const started = Date.now();

    cy.request({
      method: "GET",
      url,
      failOnStatusCode: false,               // importantísimo: no truena en 401
    }).then((resp) => {
      const ms = Date.now() - started;
      ctx.resp = resp;
      logTitle(`GET sin token: ${url} (${ms} ms)`);
      logJSON("Respuesta", resp.body);
    });
  }
);

// POST unificado
// Acepta tanto:
//   When hago POST a "/V1/invoices" con ese payload y token
// como:
//   When hago POST a "/V1/invoices" con ese payload y token (permitiendo 4xx)
When(
  /^hago POST a "([^"]+)" con ese payload y token(?: \(permitiendo 4xx\))?$/,
  (rawUrl: string, _allow4xx?: string) => {
    const apiBase = Cypress.env("API_BASE_URL") as string;
    const url = `${apiBase}${rawUrl}`;
    const started = Date.now();
    // si el step venía con "(permitiendo 4xx)" entonces NO quiero que Cypress truene
    const failOnStatusCode = !_allow4xx;

    cy.request({
      method: "POST",
      url,
      headers: {
        Authorization: Cypress.env("AUTH_TOKEN") as string,
        "Content-Type": "application/json",
      },
      body: ctx.reqBody,        // este lo cargamos en el Given de arriba
      failOnStatusCode,
    }).then((resp) => {
      const ms = Date.now() - started;
      ctx.resp = resp;          // para que el Then pueda ver status, body, etc.
      logTitle(`POST: ${url} (${ms} ms)`);
      logJSON("Respuesta", resp.body);

      // 👇 aquí metimos la regla especial que te pidieron:
      // si el payload trae total < 0, esperamos que el backend responda 422 + error
      if (
        ctx.reqBody &&
        typeof ctx.reqBody.total === "number" &&
        ctx.reqBody.total < 0
      ) {
        cy.log("🧪 Caso negativo: se espera 422");
        expect(resp.status, "Status HTTP esperado").to.eq(422);
        if (resp.body && typeof resp.body === "object") {
          expect(resp.body).to.have.property("error");
        }
      }
    });
  }
);

// DELETE unificado
When(
  /^hago DELETE a "([^"]+)" con token(?: \(permitiendo 4xx\))?$/,
  (rawUrl: string, _allow4xx?: string) => {
    const apiBase = Cypress.env("API_BASE_URL") as string;
    const url = `${apiBase}${rawUrl}`;
    const started = Date.now();
    const failOnStatusCode = !_allow4xx;

    cy.request({
      method: "DELETE",
      url,
      headers: { Authorization: Cypress.env("AUTH_TOKEN") as string },
      failOnStatusCode,
    }).then((resp) => {
      const ms = Date.now() - started;
      ctx.resp = resp;
      logTitle(`DELETE: ${url} (${ms} ms)`);
      logJSON("Respuesta", resp.body);
    });
  }
);

// PUT unificado
When(
  /^hago PUT a "([^"]+)" con ese payload y token(?: \(permitiendo 4xx\))?$/,
  (rawUrl: string, _allow4xx?: string) => {
    const apiBase = Cypress.env("API_BASE_URL") as string;
    const url = `${apiBase}${rawUrl}`;
    const started = Date.now();
    const failOnStatusCode = !_allow4xx;

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
      logTitle(`PUT: ${url} (${ms} ms)`);
      logJSON("Respuesta", resp.body);
    });
  }
);

// ================== Then (assertions) ==================
// Aquí ya no llamo al API; solo valido lo que vino en ctx.resp

// "Then la respuesta debe tener status 200"
Then("la respuesta debe tener status {int}", (status: number) => {
  expect(ctx.resp, "Respuesta HTTP debe existir").to.exist;
  expect(ctx.resp!.status).to.eq(status);
});

// "Then la respuesta debe tener status en [400, 422]"
Then("la respuesta debe tener status en [{int}, {int}]", (s1: number, s2: number) => {
  expect(ctx.resp, "Respuesta HTTP debe existir").to.exist;
  expect([s1, s2]).to.include(ctx.resp!.status);
});

// "Then el cuerpo debe incluir un arreglo "invoices""
Then("el cuerpo debe incluir un arreglo {string}", (prop: string) => {
  expect(ctx.resp!.body).to.have.property(prop);
  expect(Array.isArray(ctx.resp!.body[prop])).to.eq(true);
});

// "Then si "invoices" tiene elementos, el primero debe tener:"
//   | invoiceNumber | FAC-7081986 |
//   | status        | Vigente     |
Then(
  'si "invoices" tiene elementos, el primero debe tener:',
  (table: { raw: () => string[][] }) => {
    const rows = table.raw(); // [["invoiceNumber","FAC-7081986"], ...]
    const list = ctx.resp!.body.invoices as any[];

    // si está vacío, no trueno, solo aviso
    if (!Array.isArray(list) || list.length === 0) {
      cy.log("ℹ️ invoices está vacío; se omite validación de primer elemento.");
      return;
    }

    const first = list[0];

    // recorro la tabla del feature y voy validando cada campo
    rows.forEach(([key, expected]) => {
      let expectedVal: any = expected;
      if (expected === "true") expectedVal = true;
      if (expected === "false") expectedVal = false;
      expect(first).to.have.property(key);
      expect(first[key]).to.eq(expectedVal);
    });
  }
);

// "Then la respuesta debe reflejar los campos del payload tolerante a camelCase o snake_case"
// este Then es el que valida que si mandamos:
//  { "invoice_number": "...", "invoice_date": "...", ... }
// el backend nos puede regresar:
//  { "invoiceNumber": "...", "invoiceDate": "...", ... }
// y aún así lo aceptamos
Then(
  "la respuesta debe reflejar los campos del payload tolerante a camelCase o snake_case",
  () => {
    const req = ctx.reqBody;        // lo que mandamos
    const res = ctx.resp!.body;     // lo que regresó el API

    // mapeo tolerante
    const returnedNumber = res.invoice_number ?? res.invoiceNumber;
    const returnedDate   = res.invoice_date   ?? res.invoiceDate;
    const returnedTotal  = res.total;
    const returnedStatus = res.status;
    const returnedActive = res.active;

    // comparo con lo que yo mandé
    expect(returnedNumber).to.eq(req.invoice_number);
    expect(returnedDate).to.eq(req.invoice_date);
    expect(returnedTotal).to.eq(req.total);
    expect(returnedStatus).to.eq(req.status);
    expect(returnedActive).to.eq(req.active);
  }
);

// "Then el cuerpo debe tener la propiedad "error" con valor "Factura no encontrada""
Then(
  'el cuerpo debe tener la propiedad {string} con valor {string}',
  (prop: string, val: string) => {
    expect(ctx.resp!.body).to.have.property(prop, val);
  }
);