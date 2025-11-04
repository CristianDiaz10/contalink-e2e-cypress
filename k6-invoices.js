// ======================================================================
// 💡 Test de performance con k6
// Escenario: Consultar facturas en la API de Contalink durante 30 segundos
// Objetivo: Verificar estabilidad y velocidad de respuesta
// ======================================================================

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

// ----------------------------------------------------------------------
// ⚙️ CONFIGURACIÓN DEL TEST
// ----------------------------------------------------------------------
export const options = {
  scenarios: {
    prueba_constante: {
      executor: "constant-arrival-rate", // Mantiene un ritmo constante de peticiones
      rate: 20,                          // 20 peticiones por segundo
      timeUnit: "1s",
      duration: "30s",                   // Ejecuta por 30 segundos
      preAllocatedVUs: 20,               // Usuarios virtuales mínimos
      maxVUs: 50,                        // Máximos si se necesita más carga
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],      // Menos del 5% de errores es aceptable
    http_req_duration: ["p(95)<800"],    // El 95% de las respuestas < 800 ms
  },
};

// ----------------------------------------------------------------------
// 🔗 DATOS DE LA PRUEBA
// ----------------------------------------------------------------------
const BASE_URL = "https://candidates-api.contalink.com";
const ENDPOINT = "/V1/invoices?page=1&invoice_number=FAC-7081986";
const AUTH_TOKEN = "UXTY789@!!1"; // Token de autenticación
const tiempoRespuesta = new Trend("tiempo_respuesta_ms", true);

// ----------------------------------------------------------------------
// 🚀 ESCENARIO PRINCIPAL
// ----------------------------------------------------------------------
export default function () {
  // Construye la URL final
  const url = `${BASE_URL}${ENDPOINT}`;

  // Envía una solicitud GET a la API
  const res = http.get(url, {
    headers: {
      Authorization: AUTH_TOKEN,
      "Content-Type": "application/json",
    },
  });

  // Verificaciones básicas para cada respuesta
  check(res, {
    "✅ Código 200": (r) => r.status === 200,
    "⚡ Menos de 800ms": (r) => r.timings.duration < 800,
    "📦 Contiene 'invoice_number'": (r) =>
      r.body && r.body.includes("invoice_number"),
  });

  // Guarda el tiempo de respuesta
  tiempoRespuesta.add(res.timings.duration);

  // Pequeña pausa para simular uso humano
  sleep(0.3);
}

// ----------------------------------------------------------------------
// 📊 RESUMEN FINAL (en consola y archivo HTML)
// ----------------------------------------------------------------------
export function handleSummary(data) {
  // Toma métricas de forma segura
  const dur = data.metrics.http_req_duration || {};
  const err = data.metrics.http_req_failed || {};
  const req = data.metrics.http_reqs || {};

  const promedio = dur.avg ? dur.avg.toFixed(2) : "N/A";
  const p95 = dur["p(95)"] ? dur["p(95)"].toFixed(2) : "N/A";
  const total = req.count || 0;
  const errores = typeof err.rate === "number"
    ? (err.rate * 100).toFixed(2)
    : "0.00";

  // --------------------------
  // 🖥️ Reporte en consola
  // --------------------------
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
   - Tasa de errores: ${errores}%  (esperado < 5%)
   - Tiempo promedio: ${promedio} ms
   - Percentil 95: ${p95} ms  (esperado < 800 ms)

🔹 Conclusión:
   ${errores < 5 ? "✅ Estable y sin errores significativos." : "⚠️ Hubo fallas o lentitud."}
   ${p95 < 800 ? "✅ Buen tiempo de respuesta general." : "⚠️ El servicio responde más lento de lo esperado."}

══════════════════════════════════════════════════════════════
`;

  // --------------------------
  // 🌐 Reporte en HTML (visual)
  // --------------------------
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
    <p>${errores < 5
      ? '<span class="ok">✔ El servicio fue estable y sin errores graves.</span>'
      : '<span class="warn">✖ Se detectaron errores durante la ejecución.</span>'}</p>
    <p>${p95 < 800
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

  // Devuelve el reporte a consola y crea un archivo HTML
  return {
    stdout: consola,
    "report.html": html,
  };
}
