// k6-invoices.js
// ======================================================================
// 💡 Test de performance con k6 para Contalink
// ----------------------------------------------------------------------
// Este script:
//  - Ataca el endpoint de facturas por 30s
//  - Mantiene 20 requests por segundo
//  - Revisa que casi todas las respuestas sean rápidas (< 800ms)
//  - Al final imprime un resumen
//  - Y si corre en GitHub Actions, imprime un bloque especial para verlo ahí
// ======================================================================

import http from "k6/http";           // ← librería de k6 para hacer requests HTTP
import { check, sleep } from "k6";    // ← 'check' = asserts de k6, 'sleep' = pequeñas pausas
import { Trend } from "k6/metrics";   // ← para crear una métrica personalizada (tiempos)

// ----------------------------------------------------------------------
// ⚙️ CONFIGURACIÓN DEL TEST
// ----------------------------------------------------------------------
export const options = {
  scenarios: {                        // ← aquí defino "cómo" se va a ejecutar la prueba
    prueba_constante: {               // ← nombre del escenario (solo para identificarlo)
      executor: "constant-arrival-rate", // ← k6 va a mantener un RITMO constante
      rate: 20,                       // ← 20 peticiones por segundo (esto te pidieron)
      timeUnit: "1s",                 // ← o sea, esos 20 son por cada 1 segundo
      duration: "30s",                // ← tiempo total de la prueba
      preAllocatedVUs: 20,            // ← reserva 20 usuarios virtuales de entrada
      maxVUs: 50,                     // ← si necesita más para mantener los 20 rps, puede subir hasta 50
    },
  },
  thresholds: {                       // ← reglas de "esto es aceptable / esto no"
    "http_req_failed": ["rate<0.05"], // ← menos del 5% de requests deben fallar
    "http_req_duration": ["p(95)<800"], // ← el 95% debe tardar menos de 800ms
  },
};

// ----------------------------------------------------------------------
// 🔗 DATOS DE LA PRUEBA
// ----------------------------------------------------------------------
const BASE_URL = "https://candidates-api.contalink.com";  // ← base del API
const ENDPOINT = "/V1/invoices?page=1&invoice_number=FAC-7081986"; // ← endpoint real que vas a probar

// ⚠️ aquí está hardcodeado, pero en serio esto debería venir de una variable de entorno
const AUTH_TOKEN = "UXTY789@!!1";      // ← token para que el API te deje pasar

// creo una métrica de k6 para guardar los tiempos de respuesta
const tiempoRespuesta = new Trend("tiempo_respuesta_ms", true); // ← 'true' = se guarda también por cada VU

// ----------------------------------------------------------------------
// 🚀 ESCENARIO PRINCIPAL (esto se ejecuta muchas veces durante los 30s)
// ----------------------------------------------------------------------
export default function () {
  const url = `${BASE_URL}${ENDPOINT}`;   // ← armo la URL completa

  // hago el GET al API con el token
  const res = http.get(url, {
    headers: {
      Authorization: AUTH_TOKEN,          // ← auth del API
      "Content-Type": "application/json", // ← por si el API lo pide
    },
  });

  // valido la respuesta de cada request
  check(res, {
    "✅ responde 200 (OK)": (r) => r.status === 200,                 // ← el API respondió ok
    "⚡ responde en < 800ms": (r) => r.timings.duration < 800,       // ← fue rápido
    "📦 trae el campo invoice_number": (r) =>
      r.body && r.body.includes("invoice_number"),                  // ← la respuesta se ve como la esperamos
  });

  // guardo el tiempo de esta respuesta en la métrica personalizada
  tiempoRespuesta.add(res.timings.duration);

  // pequeña pausa para no ser 100% robot (igual el executor mantiene los 20 rps)
  sleep(0.3);
}

// ----------------------------------------------------------------------
// 📊 RESUMEN FINAL
// ----------------------------------------------------------------------
// k6 llama a esta función UNA sola vez al terminar toda la prueba.
// Aquí armamos el texto bonito y el HTML.
export function handleSummary(data) {
  // saco las métricas de k6 (si no vienen, pongo objeto vacío)
  const dur = data.metrics.http_req_duration || {}; // ← tiempos
  const err = data.metrics.http_req_failed || {};   // ← errores
  const req = data.metrics.http_reqs || {};         // ← cuántos requests se hicieron

  // convierto a números fáciles de leer
  const promedio = dur.avg ? dur.avg.toFixed(2) : "N/A";       // ← tiempo promedio
  const p95 = dur["p(95)"] ? dur["p(95)"].toFixed(2) : "N/A";  // ← el p95
  const total = req.count || 0;                                // ← cuántas peticiones se hicieron
  const errores =
    typeof err.rate === "number" ? (err.rate * 100).toFixed(2) : "0.00"; // ← porcentaje de error

  // veo si estoy corriendo dentro de GitHub Actions
  const isCI = !!__ENV.GITHUB_ACTIONS; // ← si existe esa env, estamos en CI

  // texto para consola (local o CI)
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

  // bloque especial para que en GitHub Actions se vea agrupado
  let gha = "";
  if (isCI) {
    gha += "::group::Resumen k6 – invoices\n"; // ← abre un grupo plegable en Actions
    gha += `endpoint=${BASE_URL}${ENDPOINT}\n`;
    gha += `total_reqs=${total}\n`;
    gha += `avg_ms=${promedio}\n`;
    gha += `p95_ms=${p95}\n`;
    gha += `error_rate=${errores}%\n`;

    // si la tasa de error es alta, marcamos warning en GH
    if (Number(errores) >= 5) {
      gha += "::warning::La tasa de errores fue mayor o igual al 5%\n";
    } else {
      gha += "::notice::Tasa de errores dentro del objetivo (<5%)\n";
    }

    // si el p95 está pasado, también avisamos
    if (p95 !== "N/A" && Number(p95) >= 800) {
      gha += "::warning::El p95 estuvo por encima de 800ms\n";
    } else {
      gha += "::notice::p95 dentro del objetivo (<800ms)\n";
    }

    gha += "::endgroup::\n"; // ← cierra el grupo
  }

  // HTML que vamos a subir como artefacto (para verlo bonito)
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

  // le decimos a k6 qué imprimir y qué guardar
  return {
    stdout: consola + (isCI ? gha : ""), // ← lo que se ve en terminal
    "report.html": html,                 // ← archivo que sube GitHub Actions
  };
}