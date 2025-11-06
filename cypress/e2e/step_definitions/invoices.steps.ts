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
type CreateReq = {              //plantilla personalizada de datos para crear factura
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
  basePath?: string;        // Ruta base de la API (ej. "/V1/invoices")
  reqBody?: any;            // Último payload enviado (JSON del POST/PUT)
  resp?: Cypress.Response;  // Última respuesta HTTP recibida (status, body, etc.)
} = {};                     // Objeto inicial vacío, se llenará durante la prueba

// ================== Helpers de logging ==================
// Los hago bonitos porque en Cypress el log se ve en la UI y ayuda mucho.

const logTitle = (text: string) => {
  // 🔹 1. Crea una línea de guiones (─) del mismo largo que el texto del título,
  //      para que se vea como un bloque visual.
  const line = "─".repeat(Math.max(30, text.length + 4));

  // 🔹 2. Muestra el texto en la consola del sistema (por ejemplo, la terminal)
  //      con saltos de línea antes y después para que destaque.
  // eslint-disable-next-line no-console  ←  desactiva el aviso de "no usar console.log" solo aquí.
  console.log(`\n${line}\n🔎 ${text}\n${line}`);

  // 🔹 3. Muestra el mismo título en el panel de ejecución de Cypress (en la UI)
  //      con formato en negritas usando Markdown (**texto**).
  cy.log(`**${text}**`);
};

// 🟨 logJSON()
// Muestra un objeto (por ejemplo, un JSON de respuesta) de forma bonita
const logJSON = (label: string, obj: unknown) => {
  // 🔹 1. Escribe el nombre de la sección (por ejemplo: "Respuesta:") en el panel de Cypress
  cy.log(`${label}:`);

  // 🔹 2. Convierte el objeto JavaScript a texto JSON legible (sangrado con 2 espacios)
  //      y lo encierra en un bloque de código para que Cypress lo muestre formateado.
  cy.log("```json\n" + JSON.stringify(obj, null, 2) + "\n```");

  // 🔹 3. También lo imprime en la consola para ver el detalle completo cuando se corre por terminal
  // eslint-disable-next-line no-console
  console.log(label + ":", obj);
};

// ====================================================================
// BACKGROUND
// ====================================================================

// Step de Cucumber: define la ruta base de la API para usar en los siguientes pasos.
Given("el basePath de la API es {string}", (path: string) => {
  ctx.basePath = path;                             // Guarda el path recibido (ej. "/V1/invoices") en el contexto compartido.
  logTitle(`Base path configurado: ${ctx.basePath}`); // Muestra un título bonito en logs y consola.
});

// ====================================================================
// BUILDERS (los que cargan el JSON del feature)
// ====================================================================

// Step: lee el JSON del feature (payload de creación) y lo guarda en ctx.
Given("el payload de creación es:", (docString: string) => {
  ctx.reqBody = JSON.parse(docString) as CreateReq;              // Convierte el texto """{...}""" en objeto y lo guarda.
  logJSON("📦 Payload de creación recibido", ctx.reqBody);       // Muestra el contenido del JSON en logs legibles.
});

// Step: igual que el anterior, pero para payloads de actualización.
Given("el payload de actualización es:", (docString: string) => {
  ctx.reqBody = JSON.parse(docString);                           // Convierte el texto JSON recibido y lo guarda en ctx.
  logJSON("📝 Payload de actualización recibido", ctx.reqBody);  // Lo imprime en el panel y consola.
});

// ====================================================================
// WHEN (acciones HTTP reales)
// ====================================================================

// ---------------------
// GET con token (caso feliz)
// ---------------------
// Step: realiza una petición GET autenticada (con token) al endpoint indicado.
When("hago GET a {string} con token", (rawUrl: string) => {
  const apiBase = Cypress.env("API_BASE_URL") as string;               // Lee la URL base del API desde las variables de entorno.
  const url = `${apiBase}${rawUrl}`;                                  // Une la base con el endpoint recibido (por ejemplo /V1/invoices).
  const started = Date.now();                                          // Guarda el tiempo inicial para medir cuánto tarda la petición.

  cy.log(`🌐 GET (con token) → ${url}`);                               // Escribe en el panel de Cypress qué URL está consultando.

  cy.request({                                                         // Envía una solicitud HTTP real.
    method: "GET",                                                     // Método HTTP: GET.
    url,                                                               // URL completa a la que se hace la petición.
    headers: { Authorization: Cypress.env("AUTH_TOKEN") as string },   // Incluye el token de autenticación en el header.
  }).then((resp) => {                                                  // Cuando llega la respuesta...
    const ms = Date.now() - started;                                   // Calcula el tiempo total que tardó la petición.
    ctx.resp = resp;                                                   // Guarda la respuesta en el contexto compartido (para validaciones).
    logTitle(`✅ GET con token: ${url} (${ms} ms)`);                   // Muestra un título bonito con la URL y el tiempo.
    logJSON("📥 Respuesta", resp.body);                                // Muestra el cuerpo de la respuesta en formato legible (JSON).
  });
});

// ---------------------
// GET sin token (con opción de permitir 4xx)
// ---------------------
// Acepta:
//   When hago GET a "/V1/invoices" sin token
//   When hago GET a "/V1/invoices" sin token (permitiendo 4xx)
// Step: realiza una petición GET SIN token (sirve para probar accesos no autorizados o errores 4xx)
When(
  /^hago GET a "([^"]+)" sin token(?: \(permitiendo 4xx\))?$/,          // Expreón regular: permite escribir en el feature "hago GET a ... sin token" o "sin token (permitiendo 4xx)"si
  (rawUrl: string) => {
    const apiBase = Cypress.env("API_BASE_URL") as string;             // Obtiene la base del API desde las variables de entorno.
    const url = `${apiBase}${rawUrl}`;                                // Combina la base con el endpoint recibido (por ejemplo /V1/invoices).
    const started = Date.now();                                       // Guarda el tiempo inicial para calcular cuánto tarda la petición.

    cy.log(`🌐 GET (sin token) → ${url}`);                            // Escribe en el panel de Cypress qué URL está consultando sin token.

    cy.request({                                                      // Ejecuta la solicitud HTTP.
      method: "GET",                                                  // Método GET.
      url,                                                            // URL completa de la petición.
      failOnStatusCode: false,                                        // 👈 No falla aunque el servidor devuelva 401 o 403 (porque eso puede ser esperado).
    }).then((resp) => {                                               // Cuando llega la respuesta...
      const ms = Date.now() - started;                                // Calcula el tiempo total que tardó.
      ctx.resp = resp;                                                // Guarda la respuesta en el contexto para usarla después en los Then.
      logTitle(`ℹ️ GET sin token: ${url} (${ms} ms)`);                // Muestra un título con el tiempo y la URL.
      logJSON("📥 Respuesta", resp.body);                             // Muestra el cuerpo de la respuesta en formato legible (JSON).
    });
  }
);

// ---------------------
// POST con payload y token
// ---------------------
// Acepta las 2 variantes:
//   When hago POST a "/V1/invoices" con ese payload y token
//   When hago POST a "/V1/invoices" con ese payload y token (permitiendo 4xx)
// Step: realiza una petición POST al endpoint con el payload armado en el Given (usa token)
When(
  /^hago POST a "([^"]+)" con ese payload y token(?: \(permitiendo 4xx\))?$/,  // Permite también la versión "(permitiendo 4xx)" en el texto del feature.
  (rawUrl: string, _allow4xx?: string) => {
    const apiBase = Cypress.env("API_BASE_URL") as string;          // Obtiene la URL base del API desde las variables de entorno.
    const url = `${apiBase}${rawUrl}`;                              // Une la base con el endpoint recibido (por ejemplo /V1/invoices).
    const started = Date.now();                                     // Guarda el tiempo inicial para medir cuánto tarda la petición.
    const failOnStatusCode = !_allow4xx;                            // Si el feature decía "(permitiendo 4xx)", no quiero que Cypress marque error.

    cy.log(`📤 POST → ${url}`);                                     // Muestra en el panel de Cypress a qué URL se enviará el POST.
    cy.log("📦 Enviando el payload que armamos en el Given…");       // Informa que va a usar el JSON recibido previamente.

    cy.request({                                                    // Ejecuta la solicitud HTTP POST.
      method: "POST",                                               // Método HTTP: POST.
      url,                                                          // URL completa del endpoint.
      headers: {                                                    // Headers de autenticación y tipo de contenido.
        Authorization: Cypress.env("AUTH_TOKEN") as string,         // Token de autorización.
        "Content-Type": "application/json",                         // Indica que el cuerpo se envía en formato JSON.
      },
      body: ctx.reqBody,                                            // Cuerpo del request (el JSON que guardamos en el Given).
      failOnStatusCode,                                             // Si es false, no marca error en códigos 4xx esperados.
    }).then((resp) => {                                             // Cuando llega la respuesta del servidor...
      const ms = Date.now() - started;                              // Calcula el tiempo que tardó la petición.
      ctx.resp = resp;                                              // Guarda la respuesta para usarla después en los Then.
      logTitle(`✅ POST: ${url} (${ms} ms)`);                       // Muestra un título bonito con URL y tiempo de respuesta.
      logJSON("📥 Respuesta", resp.body);                           // Muestra el cuerpo de la respuesta formateado como JSON.

      // 🧪 Caso especial: si el payload tenía un "total" negativo, esperamos error 422.
      if (
        ctx.reqBody &&
        typeof ctx.reqBody.total === "number" &&
        ctx.reqBody.total < 0
      ) {
        cy.log("🧪 Caso negativo detectado (total < 0), espero 422 del API…"); // Explica en el log qué está verificando.
        expect(resp.status, "el API debe responder 422 cuando el total es negativo")
          .to.eq(422);                                               // Verifica que el status HTTP sea 422.
        if (resp.body && typeof resp.body === "object") {            // Si hay cuerpo en la respuesta...
          expect(resp.body, "el cuerpo debe traer la propiedad 'error'")
            .to.have.property("error");                              // Debe contener una propiedad 'error'.
        }
      }
    });
  }
);

// ---------------------
// DELETE con token
// ---------------------
// Step: realiza una petición DELETE al API con token (sirve para borrar un registro)
When(
  /^hago DELETE a "([^"]+)" con token(?: \(permitiendo 4xx\))?$/,   // Expresión regular que permite steps como: "hago DELETE a '/V1/invoices/123' con token" o con "(permitiendo 4xx)"
  (rawUrl: string, _allow4xx?: string) => {                        // Función que recibe la URL del feature y si se permite fallo 4xx.
    const apiBase = Cypress.env("API_BASE_URL") as string;         // Obtiene la base del API desde las variables de entorno (por ejemplo, https://api.contalink.com).
    const url = `${apiBase}${rawUrl}`;                             // Une la base con el endpoint recibido, formando la URL completa.
    const started = Date.now();                                    // Guarda el tiempo inicial para medir cuánto tarda la petición.
    const failOnStatusCode = !_allow4xx;                           // Si el step decía "(permitiendo 4xx)", no debe marcar error aunque el status sea 400-499.

    cy.log(`🗑️ DELETE → ${url}`);                                  // Escribe en el panel de Cypress la URL que está por borrar.

    cy.request({                                                   // Ejecuta la solicitud HTTP DELETE.
      method: "DELETE",                                            // Método HTTP DELETE.
      url,                                                         // URL completa del recurso a eliminar.
      headers: { Authorization: Cypress.env("AUTH_TOKEN") as string }, // Header con el token de autenticación.
      failOnStatusCode,                                            // Si es false, Cypress no fallará aunque la API responda con error 4xx.
    }).then((resp) => {                                            // Cuando llega la respuesta...
      const ms = Date.now() - started;                             // Calcula cuántos milisegundos tardó la solicitud.
      ctx.resp = resp;                                             // Guarda la respuesta para que otros steps (Then) puedan validarla.
      logTitle(`✅ DELETE: ${url} (${ms} ms)`);                    // Muestra en el log que se completó el DELETE y el tiempo que tomó.
      logJSON("📥 Respuesta", resp.body);                          // Muestra el cuerpo de la respuesta en formato JSON para inspeccionarlo fácilmente.
    });
  }
);

// ---------------------
// PUT con token
// ---------------------
// Step: realiza una petición PUT al API con token (sirve para actualizar un registro existente)
When(
  /^hago PUT a "([^"]+)" con ese payload y token(?: \(permitiendo 4xx\))?$/, // Expresión regular que reconoce el texto del step, con o sin "(permitiendo 4xx)".
  (rawUrl: string, _allow4xx?: string) => {                                // Función que recibe la URL del feature y un flag opcional para permitir errores 4xx.
    const apiBase = Cypress.env("API_BASE_URL") as string;                 // Toma la base del API desde variables de entorno (por ejemplo, "https://api.contalink.com").
    const url = `${apiBase}${rawUrl}`;                                     // Une la base con el endpoint recibido (por ejemplo, "/V1/invoices/123").
    const started = Date.now();                                            // Guarda el tiempo inicial para medir la duración de la petición.
    const failOnStatusCode = !_allow4xx;                                   // Si el step incluía "(permitiendo 4xx)", no marcará error en respuestas 400–499.

    cy.log(`📝 PUT → ${url}`);                                             // Escribe en el panel de Cypress qué endpoint se va a actualizar.

    cy.request({                                                           // Envía la solicitud HTTP PUT.
      method: "PUT",                                                       // Método HTTP: PUT (se usa para actualizar recursos).
      url,                                                                 // URL completa del endpoint.
      headers: {                                                           // Encabezados necesarios para autenticación y formato.
        Authorization: Cypress.env("AUTH_TOKEN") as string,                // Token de autorización para el API.
        "Content-Type": "application/json",                                // Indica que el cuerpo se envía en formato JSON.
      },
      body: ctx.reqBody,                                                   // Cuerpo de la solicitud (JSON definido antes en el Given).
      failOnStatusCode,                                                    // Permite o no errores 4xx según lo que diga el step.
    }).then((resp) => {                                                    // Se ejecuta cuando llega la respuesta del servidor.
      const ms = Date.now() - started;                                     // Calcula cuánto tiempo tardó la petición.
      ctx.resp = resp;                                                     // Guarda la respuesta para validarla en los pasos Then.
      logTitle(`✅ PUT: ${url} (${ms} ms)`);                               // Muestra en el log que se completó correctamente, con tiempo incluido.
      logJSON("📥 Respuesta", resp.body);                                  // Imprime el cuerpo de la respuesta en formato JSON legible.
    });
  }
);

// ====================================================================
// THEN (validaciones)
// ====================================================================

// Valida que la respuesta tenga el código de estado exacto (por ejemplo 200)
Then("la respuesta debe tener status {int}", (status: number) => {
  expect(ctx.resp, "❌ No hay respuesta HTTP guardada en el contexto.").to.exist; // Verifica que sí tengamos una respuesta guardada.
  expect(ctx.resp!.status, "❌ El código de estado no coincide.")                // Compara el código HTTP real con el esperado.
    .to.eq(status);
});

// Valida que el status esté dentro de un rango permitido (por ejemplo 400 o 422)
Then("la respuesta debe tener status en [{int}, {int}]", (s1: number, s2: number) => {
  expect(ctx.resp, "❌ No hay respuesta HTTP guardada en el contexto.").to.exist; // Asegura que haya una respuesta.
  expect([s1, s2], "❌ El status no está en el rango esperado.")                  // Verifica que el status esté en la lista dada.
    .to.include(ctx.resp!.status);
});

// Verifica que el body de la respuesta incluya una propiedad tipo arreglo (por ejemplo "invoices")
Then("el cuerpo debe incluir un arreglo {string}", (prop: string) => {
  expect(ctx.resp!.body, "❌ La respuesta no tiene body.").to.have.property(prop); // El body debe tener esa propiedad.
  expect(                                                                       
    Array.isArray(ctx.resp!.body[prop]),                                         // Comprueba que esa propiedad sea un arreglo.
    `❌ La propiedad ${prop} existe pero no es un arreglo.`
  ).to.eq(true);
});

// Si "invoices" tiene elementos, valida que el primero tenga ciertos campos específicos
Then(
  'si "invoices" tiene elementos, el primero debe tener:',
  (table: { raw: () => string[][] }) => {
    const rows = table.raw();                        // Convierte la tabla Gherkin del .feature en un arreglo [["campo","valor"], ...]
    const list = ctx.resp!.body.invoices as any[];   // Obtiene la lista de facturas del body.

    if (!Array.isArray(list) || list.length === 0) { // Si el arreglo está vacío, se omite la validación.
      cy.log("ℹ️ 'invoices' vino vacío; no se hace validación de campos.");
      return;
    }

    const first = list[0];                           // Toma el primer elemento de la lista (la primera factura).

    rows.forEach(([key, expected]) => {              // Recorre cada fila de la tabla (campo esperado y su valor).
      let expectedVal: any = expected;
      if (expected === "true") expectedVal = true;   // Convierte "true"/"false" a booleanos reales.
      if (expected === "false") expectedVal = false;

      expect(first, "❌ El primer elemento no trae el campo esperado.") // Verifica que el campo exista.
        .to.have.property(key);
      expect(first[key], `❌ El campo ${key} no coincide con lo esperado.`) // Compara el valor del campo con lo esperado.
        .to.eq(expectedVal);
    });
  }
);

// Valida que el backend devuelva los mismos campos que se mandaron en el payload,
// aceptando tanto snake_case (invoice_number) como camelCase (invoiceNumber).
Then(
  "la respuesta debe reflejar los campos del payload tolerante a camelCase o snake_case", // Nombre del paso Then
  () => { // Función que se ejecuta cuando este paso aparece en el feature

    const req = ctx.reqBody;           // El JSON que enviamos (lo guardamos antes en el Given)
    const res = ctx.resp!.body;        // El JSON que recibimos del API como respuesta

    // 🔍 Lee los valores del response, sin importar si vienen en camelCase o snake_case
    const returnedNumber = res.invoice_number ?? res.invoiceNumber; // Usa el que exista
    const returnedDate   = res.invoice_date   ?? res.invoiceDate;   // Igual para la fecha
    const returnedTotal  = res.total;                               // Total
    const returnedStatus = res.status;                              // Estado
    const returnedActive = res.active;                              // Campo activo/inactivo

    // ✅ Compara que los valores devueltos coincidan con los que se enviaron
    expect(returnedNumber, "❌ El número de factura no coincide.")   // Compara invoice_number
      .to.eq(req.invoice_number);
    expect(returnedDate, "❌ La fecha no coincide.")                 // Compara invoice_date
      .to.eq(req.invoice_date);
    expect(returnedTotal, "❌ El total no coincide.")                // Compara total
      .to.eq(req.total);
    expect(returnedStatus, "❌ El estado no coincide.")              // Compara status
      .to.eq(req.status);
    expect(returnedActive, "❌ El campo 'active' no coincide.")      // Compara active
      .to.eq(req.active);
  }
);

// Valida que el cuerpo de la respuesta tenga una propiedad específica con un valor determinado
// Ejemplo: Then el cuerpo debe tener la propiedad "error" con valor "Factura no encontrada"
Then( // 🔹 Define un paso "Then" de Cucumber (una validación al final del escenario)
  'el cuerpo debe tener la propiedad {string} con valor {string}', // 🧩 Texto del paso con dos variables dinámicas: propiedad y valor
  (prop: string, val: string) => { // 👉 Recibe los valores reales desde el feature (por ejemplo "error" y "Factura no encontrada")

    // ✅ Comprueba que la respuesta (ctx.resp!.body) existe; si no, muestra el mensaje de error indicado
    expect(ctx.resp!.body, "❌ La respuesta no tiene body.")
      // 🔍 Verifica que el JSON de respuesta tenga una propiedad `prop`
      //    y que su valor sea exactamente igual a `val`
      .to.have.property(
        prop,  // Nombre de la propiedad (por ejemplo "error")
        val    // Valor esperado (por ejemplo "Factura no encontrada")
      );
  }
);