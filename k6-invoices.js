// ======================================================================
// 💡 Test de performance con k6
// Escenario: Consultar facturas en la API de Contalink durante 30 segundos
// Objetivo: Verificar estabilidad y velocidad de respuesta
// ======================================================================

// Importamos los módulos base de k6
import http from "k6/http";     // Para hacer solicitudes HTTP
import { check, sleep } from "k6"; // Para validaciones y pausas entre requests
import { Trend } from "k6/metrics"; // Para crear métricas personalizadas (tiempos, etc.)

// ----------------------------------------------------------------------
// ⚙️ CONFIGURACIÓN DEL TEST
// ----------------------------------------------------------------------
export const options = {
  scenarios: {
    // Definimos un escenario llamado "prueba_constante"
    prueba_constante: {
      executor: "constant-arrival-rate", // Tipo de ejecución: ritmo constante de solicitudes
      rate: 20,                          // 🔢 20 peticiones por segundo
      timeUnit: "1s",                    // Cada segundo se inician 20 peticiones
      duration: "30s",                   // 🕒 Durará 30 segundos
      preAllocatedVUs: 20,               // Usuarios virtuales mínimos preasignados
      maxVUs: 50,                        // Máximo de VUs que puede escalar
    },
  },
  thresholds: {
    // Límites de aceptación (si se superan, k6 marcará el test como fallido)
    http_req_failed: ["rate<0.05"],      // Menos del 5% de fallos permitidos
    http_req_duration: ["p(95)<800"],    // 95% de las respuestas deben tardar < 800ms
  },
};

// ----------------------------------------------------------------------
// 🔗 DATOS DE LA PRUEBA
// ----------------------------------------------------------------------
const BASE_URL = "https://candidates-api.contalink.com"; // URL base del servicio
const ENDPOINT = "/V1/invoices?page=1&invoice_number=FAC-7081986"; // Endpoint a probar
const AUTH_TOKEN = "UXTY789@!!1"; // ⚠️ Token hardcodeado (debería venir de variables de entorno)

// Creamos una métrica personalizada para medir tiempos de respuesta
const tiempoRespuesta = new Trend("tiempo_respuesta_ms", true);

// ----------------------------------------------------------------------
// 🚀 ESCENARIO PRINCIPAL
// ----------------------------------------------------------------------
export default function () {
  // 🔗 Construimos la URL completa a la que se enviará la solicitud
  const url = `${BASE_URL}${ENDPOINT}`;

  // 📡 Enviamos una petición GET autenticada
  const res = http.get(url, {
    headers: {
      Authorization: AUTH_TOKEN,
      "Content-Type": "application/json",
    },
  });

  // ✅ Validamos respuestas por cada request
  check(res, {
    "✅ Código 200": (r) => r.status === 200, // Responde correctamente
    "⚡ Menos de 800ms": (r) => r.timings.duration < 800, // Tiempo aceptable
    "📦 Contiene 'invoice_number'": (r) =>
      r.body && r.body.includes("invoice_number"), // Verifica estructura esperada
  });

  // 📊 Guardamos el tiempo de respuesta para la métrica personalizada
  tiempoRespuesta.add(res.timings.duration);

  // ⏸️ Pausa corta entre peticiones (simula comportamiento humano)
  sleep(0.3);
}

// ----------------------------------------------------------------------
// 📊 RESUMEN FINAL (en consola y archivo HTML)
// ----------------------------------------------------------------------
export function handleSummary(data) {
  // --------------------------
  // 1️⃣ Extraemos las métricas clave
  // --------------------------
  const dur = data.metrics.http_req_duration || {};
  const err = data.metrics.http_req_failed || {};
  const req = data.metrics.http_reqs || {};

  // 🧮 Calculamos valores importantes
  const promedio = dur.avg ? dur.avg.toFixed(2) : "N/A"; // Tiempo medio de respuesta
  const p95 = dur["p(95)"] ? dur["p(95)"].toFixed(2) : "N/A"; // Percentil 95
  const total = req.count || 0; // Número total de requests
  const errores = typeof err.rate === "number"
    ? (err.rate * 100).toFixed(2)
    : "0.00"; // Porcentaje de errores

  // --------------------------
  // 2️⃣ Detectamos si se ejecuta en GitHub Actions (variable de entorno)
  // --------------------------
  const isCI = !!__ENV.GITHUB_ACTIONS;

  // --------------------------
  // 3️⃣ Texto bonito para consola
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
  // 4️⃣ Bloques visibles en GitHub Actions
  // --------------------------
  // GitHub interpreta "::notice::", "::warning::", "::group::" como anotaciones especiales
  let gha = "";
  if (isCI) {
    gha += "::group::Resumen k6 – invoices\n"; // Agrupa el resumen
    gha += `endpoint=${BASE_URL}${ENDPOINT}\n`;
    gha += `total_reqs=${total}\n`;
    gha += `avg_ms=${promedio}\n`;
    gha += `p95_ms=${p95}\n`;
    gha += `error_rate=${errores}%\n`;

    // 🔔 Si algo está fuera de objetivo, mostramos advertencias
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

  // --------------------------
  // 5️⃣ Reporte HTML visual (artefacto del workflow)
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

  // --------------------------
  // 6️⃣ Devolvemos el resumen a k6
  // --------------------------
  return {
    stdout: consola + (isCI ? gha : ""), // 📤 Lo que se imprime en consola/CI
    "report.html": html,                 // 🗂️ Archivo HTML generado
  };
}
