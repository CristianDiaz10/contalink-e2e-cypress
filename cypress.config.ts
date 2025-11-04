// =============================================================
// ⚙️ CONFIGURACIÓN PRINCIPAL DE CYPRESS
// -------------------------------------------------------------
// Este archivo controla todo el comportamiento del entorno E2E.
// Aquí se configuran:
//   ✅ El preprocesador de Cucumber (para usar archivos .feature)
//   ✅ La integración con esbuild (para transpilar TypeScript rápido)
//   ✅ Variables de entorno (dotenv)
//   ✅ Ajustes del navegador y reintentos
//   ✅ URLs base para frontend y backend
// =============================================================

// -------------------------------------------------------------
// 🧱 IMPORTS BÁSICOS
// -------------------------------------------------------------

import { defineConfig } from "cypress";
// 🥒 Plugin que permite usar Cucumber (.feature)
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
// 🔧 Integración con esbuild para compilar los steps TypeScript
import createEsbuildPlugin from "@badeball/cypress-cucumber-preprocessor/esbuild";
// 🚀 Bundler (empaquetador) recomendado para Cypress + esbuild
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
// 🌱 Carga variables de entorno desde .env
import "dotenv/config"; // (requiere instalar: npm i -D dotenv)


// =============================================================
// 🧩 EXPORTACIÓN DE LA CONFIGURACIÓN PRINCIPAL
// =============================================================
export default defineConfig({
  e2e: {
    // =========================================================
    // 🌍 URL base de la aplicación (frontend)
    // ---------------------------------------------------------
    // Esta es la URL que se abre cuando se ejecuta `cy.visit('/')`
    // Si no existe la variable BASE_URL en .env, usa el entorno QA.
    // =========================================================
    baseUrl: process.env.BASE_URL || "https://candidates-qa.contalink.com",

    // =========================================================
    // 🔍 ARCHIVOS QUE SE EJECUTAN COMO TESTS
    // ---------------------------------------------------------
    // - Busca los archivos .feature (Cucumber)
    // - Busca los archivos clásicos de Cypress .cy.ts
    // =========================================================
    specPattern: [
      "features/**/*.feature",          // Si tus features están fuera de /cypress
      "cypress/e2e/**/*.feature",       // Features dentro de Cypress
      "**/*.cy.{js,jsx,ts,tsx}",        // Tests clásicos de Cypress
    ],

    // =========================================================
    // 🧩 ARCHIVO DE SOPORTE
    // ---------------------------------------------------------
    // Este archivo se carga antes de todos los tests.
    // Ideal para registrar comandos, hooks globales, etc.
    // =========================================================
    supportFile: "cypress/support/e2e.ts",

    // =========================================================
    // 📹 OPCIONES VISUALES
    // =========================================================
    video: true,             // Graba video de la ejecución
    viewportWidth: 1366,     // Tamaño horizontal
    viewportHeight: 768,     // Tamaño vertical
    chromeWebSecurity: false,// Permite probar entornos con contenido inseguro

    // =========================================================
    // 🔁 REINTENTOS DE TESTS
    // ---------------------------------------------------------
    // Si un test falla en modo headless, se vuelve a intentar 2 veces.
    // En modo interactivo (npm run cy:open) no se reintenta.
    // =========================================================
    retries: { runMode: 2, openMode: 0 },

    // =========================================================
    // 🌐 VARIABLES DE ENTORNO DISPONIBLES EN CYPRESS
    // ---------------------------------------------------------
    // Estas variables se pueden usar dentro de los tests con:
    //   Cypress.env("NOMBRE")
    // =========================================================
    env: {
      // 🔐 Token de autenticación para peticiones directas al API
      AUTH_TOKEN:
        process.env.AUTH_TOKEN ||
        process.env.ACCESS_CODE || // por si lo usas con el mismo valor
        "UXTY789@!!1",

      // 👤 Código de acceso del login (#access-code)
      ACCESS_CODE:
        process.env.ACCESS_CODE ||
        "UXTY789@!!1",

      // 📦 Prefijo del API (ej. /V1)
      BASE_PATH: process.env.BASE_PATH || "/V1",

      // 🌐 URL base del backend/API (para cy.request)
      API_BASE_URL:
        process.env.API_BASE_URL ||
        "https://candidates-api.contalink.com",

      // 🧾 Datos de prueba por defecto (factura)
      INVOICE_NUMBER: process.env.INVOICE_NUMBER || "FACTURA-CRIS",
      INVOICE_TOTAL: Number(process.env.INVOICE_TOTAL || "100"),
      INVOICE_STATUS: process.env.INVOICE_STATUS || "Vigente",
    },

    // =========================================================
    // 🧠 EVENTOS DE CYPRESS (CONFIGURACIÓN AVANZADA)
    // ---------------------------------------------------------
    // Aquí se configuran los plugins que extienden Cypress:
    //   - Cucumber Preprocessor
    //   - Esbuild Bundler
    //   - Configuración del navegador
    // =========================================================
    async setupNodeEvents(on, config) {
      // -------------------------------------------------------
      // 🥒 1️⃣ Activamos el preprocesador de Cucumber
      // -------------------------------------------------------
      await addCucumberPreprocessorPlugin(on, config);

      // -------------------------------------------------------
      // 🧱 2️⃣ Activamos el empaquetador (esbuild)
      // -------------------------------------------------------
      on(
        "file:preprocessor",
        createBundler({
          plugins: [createEsbuildPlugin(config)],
        })
      );

      // -------------------------------------------------------
      // 🌐 3️⃣ Ajustes de navegador (seguridad / certificados)
      // -------------------------------------------------------
      on("before:browser:launch", (browser, launchOptions) => {
        if (browser.family === "chromium") {
          // Añadimos flags de Chrome para entornos QA/inseguros
          launchOptions.args.push(
            "--ignore-certificate-errors",
            "--allow-insecure-localhost",
            "--allow-running-insecure-content",
            "--disable-web-security",
            "--disable-features=BlockInsecurePrivateNetworkRequests,InsecurePrivateNetworkRequestsAllowed"
          );
        }

        if (browser.name === "electron") {
          // Desactiva seguridad en Electron (para debug local)
          // @ts-ignore
          launchOptions.preferences = {
            ...(launchOptions.preferences || {}),
            webSecurity: false,
            allowRunningInsecureContent: true,
          };
        }

        return launchOptions;
      });

      // 🔁 Devolvemos la configuración final
      return config;
    },
  },
});