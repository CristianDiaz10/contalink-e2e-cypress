import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";
import { expect } from "chai";

// ================== Tipos ==================
type CreateReq = {
  invoice_number: string;
  total: number;
  invoice_date: string;
  status: string;
  active: boolean;
};

// ================== Contexto compartido ==================
const ctx: {
  basePath?: string;
  reqBody?: any;
  resp?: Cypress.Response;
} = {};

// ================== Helpers de logging ==================
const logTitle = (text: string) => {
  const line = "─".repeat(Math.max(30, text.length + 4));
  // eslint-disable-next-line no-console
  console.log(`\n${line}\n🔎 ${text}\n${line}`);
  cy.log(`**${text}**`);
};

const logJSON = (label: string, obj: unknown) => {
  cy.log(`${label}:`);
  cy.log("```json\n" + JSON.stringify(obj, null, 2) + "\n```");
  // eslint-disable-next-line no-console
  console.log(label + ":", obj);
};

// ================== Background ==================
Given("el basePath de la API es {string}", (path: string) => {
  ctx.basePath = path;
  logTitle(`Base path configurado: ${ctx.basePath}`);
});

// ================== Builders ==================
Given("el payload de creación es:", (docString: string) => {
  ctx.reqBody = JSON.parse(docString) as CreateReq;
  logJSON("Payload de creación", ctx.reqBody);
});

Given("el payload de actualización es:", (docString: string) => {
  ctx.reqBody = JSON.parse(docString);
  logJSON("Payload de actualización", ctx.reqBody);
});

// ================== When (HTTP actions) ==================

// GET con token
When("hago GET a {string} con token", (rawUrl: string) => {
  // 👇 tomamos el dominio del API desde cypress.config.ts → env.API_BASE_URL
  const apiBase = Cypress.env("API_BASE_URL") as string;
  const url = `${apiBase}${rawUrl}`;
  const started = Date.now();

  cy.request({
    method: "GET",
    url,
    headers: { Authorization: Cypress.env("AUTH_TOKEN") as string },
  }).then((resp) => {
    const ms = Date.now() - started;
    ctx.resp = resp;
    logTitle(`GET con token: ${url} (${ms} ms)`);
    logJSON("Respuesta", resp.body);
  });
});

// GET sin token (con o sin " (permitiendo 4xx)")
When(
  /^hago GET a "([^"]+)" sin token(?: \(permitiendo 4xx\))?$/,
  (rawUrl: string) => {
    const apiBase = Cypress.env("API_BASE_URL") as string;
    const url = `${apiBase}${rawUrl}`;
    const started = Date.now();

    cy.request({
      method: "GET",
      url,
      failOnStatusCode: false, // sin token aceptamos 4xx
    }).then((resp) => {
      const ms = Date.now() - started;
      ctx.resp = resp;
      logTitle(`GET sin token: ${url} (${ms} ms)`);
      logJSON("Respuesta", resp.body);
    });
  }
);

// POST unificado (con/sin " (permitiendo 4xx)") + validación especial 422 si total < 0
When(
  /^hago POST a "([^"]+)" con ese payload y token(?: \(permitiendo 4xx\))?$/,
  (rawUrl: string, _allow4xx?: string) => {
    const apiBase = Cypress.env("API_BASE_URL") as string;
    const url = `${apiBase}${rawUrl}`;
    const started = Date.now();
    const failOnStatusCode = !_allow4xx; // si trae la coletilla -> permitimos 4xx

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
      logTitle(`POST: ${url} (${ms} ms)`);
      logJSON("Respuesta", resp.body);

      // 🧪 Si es un caso negativo (total < 0), esperamos 422 y un mensaje de error
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

// DELETE unificado (con/sin " (permitiendo 4xx)")
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

// PUT unificado (con/sin " (permitiendo 4xx)")
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
Then("la respuesta debe tener status {int}", (status: number) => {
  expect(ctx.resp, "Respuesta HTTP debe existir").to.exist;
  expect(ctx.resp!.status).to.eq(status);
});

Then("la respuesta debe tener status en [{int}, {int}]", (s1: number, s2: number) => {
  expect(ctx.resp, "Respuesta HTTP debe existir").to.exist;
  expect([s1, s2]).to.include(ctx.resp!.status);
});

Then("el cuerpo debe incluir un arreglo {string}", (prop: string) => {
  expect(ctx.resp!.body).to.have.property(prop);
  expect(Array.isArray(ctx.resp!.body[prop])).to.eq(true);
});

Then(
  'si "invoices" tiene elementos, el primero debe tener:',
  (table: { raw: () => string[][] }) => {
    const rows = table.raw(); // [["invoiceNumber","FAC-7081986"], ...]
    const list = ctx.resp!.body.invoices as any[];
    if (!Array.isArray(list) || list.length === 0) {
      cy.log("ℹ️ invoices está vacío; se omite validación de primer elemento.");
      return;
    }
    const first = list[0];
    rows.forEach(([key, expected]) => {
      let expectedVal: any = expected;
      if (expected === "true") expectedVal = true;
      if (expected === "false") expectedVal = false;
      expect(first).to.have.property(key);
      expect(first[key]).to.eq(expectedVal);
    });
  }
);

Then(
  "la respuesta debe reflejar los campos del payload tolerante a camelCase o snake_case",
  () => {
    const req = ctx.reqBody;
    const res = ctx.resp!.body;
    const returnedNumber = res.invoice_number ?? res.invoiceNumber;
    const returnedDate = res.invoice_date ?? res.invoiceDate;
    const returnedTotal = res.total;
    const returnedStatus = res.status;
    const returnedActive = res.active;

    expect(returnedNumber).to.eq(req.invoice_number);
    expect(returnedDate).to.eq(req.invoice_date);
    expect(returnedTotal).to.eq(req.total);
    expect(returnedStatus).to.eq(req.status);
    expect(returnedActive).to.eq(req.active);
  }
);

Then(
  'el cuerpo debe tener la propiedad {string} con valor {string}',
  (prop: string, val: string) => {
    expect(ctx.resp!.body).to.have.property(prop, val);
  }
);