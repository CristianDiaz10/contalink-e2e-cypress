// k6-invoices.js
// ======================================================================
// 💡 Test de performance con k6 para Contalink
// ----------------------------------------------------------------------
// Qué hace este script:
//   - Le pega 30 segundos al endpoint de facturas
//   - A 20 requests por segundo (RPS)
//   - Valida que casi todas las respuestas sean rápidas (< 800 ms)
//   - Al final imprime un resumen bonito
//   - Y si está corriendo en GitHub Actions, también imprime anotaciones
//     que se ven en la pestaña de Actions.
// ======================================================================

import http from "k6/http";           // para hacer solicitudes HTTP
import { check, sleep } from "k6";    // para validar y pausar
import { Trend } from "k6/metrics";   // para guardar tiempos personalizados

// ----------------------------------------------------------------------
// ⚙️ CONFIGURACIÓN DEL TEST
// ----------------------------------------------------------------------
// Aquí definimos: cuántos segundos, cuántas peticiones por segundo,
// y cuáles son los “mínimos aceptables” para decir que la API está bien.
export const options = {
  scenarios: {
    // le puse nombre al escenario solo para que se entienda en el output
    prueba_constante: {
      executor: "constant-arrival-rate", // ritmo constante de peticiones
      rate: 20,                          // 👈 20 peticiones por segundo
      timeUnit: "1s",
      duration: "30s",                   // 👈 durante 30 segundos
      preAllocatedVUs: 20,               // reserva 20 VUs
      maxVUs: 50,                        // puede subir hasta 50 si hace falta
    },
  },
  thresholds: {
    // si más del 5% falla → el test aparece como fallido
    "http_req_failed": ["rate<0.05"],
    // si el p95 se pasa de 800ms → también lo marca
    "http_req_duration": ["p(95)<800"],
  },
};

// ----------------------------------------------------------------------
// 🔗 DATOS DE LA PRUEBA (ajusta estos tres primero si cambias de entorno)
// ----------------------------------------------------------------------
const BASE_URL = "https://candidates-api.contalink.com";
const ENDPOINT = "/V1/invoices?page=1&invoice_number=FAC-7081986";
// ⚠️ en serio: en un proyecto real, este token debería venir por env: __ENV.AUTH_TOKEN
const AUTH_TOKEN = "UXTY789@!!1";

// métrica personalizada: guardo todos los tiempos de respuesta
const tiempoRespuesta = new Trend("tiempo_respuesta_ms", true);

// ----------------------------------------------------------------------
// 🚀 ESCENARIO PRINCIPAL
// ----------------------------------------------------------------------
export default function () {
  // 1) Armo la URL
  const url = `${BASE_URL}${ENDPOINT}`;

  // 2) Hago la petición con header Authorization
  const res = http.get(url, {
    headers: {
      Authorization: AUTH_TOKEN,
      "Content-Type": "application/json",
    },
  });

  // 3) Validaciones por cada request
  //    Las hice con nombres que se entienden en el reporte
  check(res, {
    "✅ responde 200 (OK)": (r) => r.status === 200,
    "⚡ responde en < 800ms": (r) => r.timings.duration < 800,
    "📦 trae el campo invoice_number": (r) =>
      r.body && r.body.includes("invoice_number"),
  });

  // 4) guardo el tiempo en la métrica personalizada
  tiempoRespuesta.add(res.timings.duration);

  // 5) pausa chiquita
  sleep(0.3);
}

// ----------------------------------------------------------------------
// 📊 RESUMEN FINAL (se ejecuta UNA sola vez al terminar el test)
// ----------------------------------------------------------------------
// k6 llama a handleSummary y lo que devolvemos aquí se imprime
// y/o se guarda como archivo.
export function handleSummary(data) {
  // 1. saco las métricas que me interesan
  const dur = data.metrics.http_req_duration || {};
  const err = data.metrics.http_req_failed || {};
  const req = data.metrics.http_reqs || {};

  // 2. las vuelvo fáciles de leer
  const promedio = dur.avg ? dur.avg.toFixed(2) : "N/A";
  const p95 = dur["p(95)"] ? dur["p(95)"].toFixed(2) : "N/A";
  const total = req.count || 0;
  const errores =
    typeof err.rate === "number" ? (err.rate * 100).toFixed(2) : "0.00";

  // 3. detecto si estoy dentro de GitHub Actions
  //    (allá la variable GITHUB_ACTIONS viene en el entorno)
  const isCI = !!__ENV.GITHUB_ACTIONS;

  // 4. texto bonito para consola local
  const consola = `
══════════════════════════════════════════════════════════════
📘 RESULTADOS DEL TEST DE PERFORMANCE
══════════════════════════════════════════════════════════════
🔹 Endpoint probado:
   ${BASE_URL}${ENDPOINT}

🔹 Escenario:
   - Duración: 30 segundos
   - Frecuencia: 20 peticiones por segundo
   - Total de peticiones: ${total}

🔹 Resultados:
   - Tasa de errores: ${errores}%  (objetivo < 5%)
   - Tiempo promedio: ${promedio} ms
   - Percentil 95: ${p95} ms  (objetivo < 800 ms)

🔹 Conclusión:
   ${Number(errores) < 5 ? "✅ Estable y casi sin fallas." : "⚠️ Hubo errores o timeouts."}
   ${p95 !== "N/A" && Number(p95) < 800 ? "✅ Responde rápido (p95 OK)." : "⚠️ Responde más lento de lo esperado (p95 > 800ms)."}

══════════════════════════════════════════════════════════════
`;

  // 5. bloque especial para GitHub Actions
  //    esto hace que en Actions se vea un grupito “Resumen k6 – invoices”
  let gha = "";
  if (isCI) {
    gha += "::group::Resumen k6 – invoices\n";
    gha += `endpoint=${BASE_URL}${ENDPOINT}\n`;
    gha += `total_reqs=${total}\n`;
    gha += `avg_ms=${promedio}\n`;
    gha += `p95_ms=${p95}\n`;
    gha += `error_rate=${errores}%\n`;

    // avisos sencillos
    if (Number(errores) >= 5) {
      gha += "::warning::La tasa de errores fue mayor o igual al 5%\n";
    } else {
      gha += "::notice::Tasa de errores dentro del objetivo (<5%)\n";
    }

    if (p95 !== "N/A" && Number(p95) >= 800) {
      gha += "::warning::El p95 estuvo por encima de 800ms\n";
    } else {
      gha += "::notice::p95 dentro del objetivo (<800ms)\n";
    }

    gha += "::endgroup::\n";
  }

  // 6. HTML simple para subirlo como artefacto en el workflow
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Performance - Contalink API</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f9f9; color: #333; margin: 2rem; }
    h1 { color: #2e7d32; }
    .card { background: white; padding: 1.5rem 2rem; margin-bottom: 1rem;
            border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,.1); }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: .6rem .8rem; border-bottom: 1px solid #eee; text-align: left; }
    th { background: #fafafa; }
    .ok { color: #2e7d32; font-weight: bold; }
    .warn { color: #c62828; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Reporte de Performance - API Contalink</h1>

  <div class="card">
    <h2>Resumen de la prueba</h2>
    <p><strong>Endpoint:</strong> ${BASE_URL}${ENDPOINT}</p>
    <p><strong>Duración:</strong> 30 segundos</p>
    <p><strong>Frecuencia:</strong> 20 peticiones por segundo</p>
    <p><strong>Total de peticiones:</strong> ${total}</p>
  </div>

  <div class="card">
    <h2>Métricas principales</h2>
    <table>
      <tr><th>Métrica</th><th>Valor</th><th>Objetivo</th></tr>
      <tr><td>Tasa de errores</td><td>${errores}%</td><td>< 5%</td></tr>
      <tr><td>Promedio (ms)</td><td>${promedio}</td><td>-</td></tr>
      <tr><td>p95 (ms)</td><td>${p95}</td><td>< 800</td></tr>
    </table>
  </div>

  <div class="card">
    <h2>Conclusión</h2>
    <p>${Number(errores) < 5
      ? '<span class="ok">✔ El servicio fue estable y sin errores graves.</span>'
      : '<span class="warn">✖ Se detectaron errores durante la ejecución.</span>'}</p>
    <p>${p95 !== "N/A" && Number(p95) < 800
      ? '<span class="ok">✔ Los tiempos de respuesta fueron aceptables.</span>'
      : '<span class="warn">✖ El servicio respondió más lento de lo esperado.</span>'}</p>
  </div>

  <div class="card">
    <h2>Comando usado</h2>
    <code>k6 run k6-invoices.js</code>
  </div>
</body>
</html>
`;

  // 7. devolvemos lo que k6 tiene que escribir
  return {
    // lo que ves en la terminal
    stdout: consola + (isCI ? gha : ""),
    // lo que se guarda como archivo (lo sube el workflow)
    "report.html": html,
  };
}