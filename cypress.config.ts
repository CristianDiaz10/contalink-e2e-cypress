// cypress.config.ts
import { defineConfig } from "cypress";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import createEsbuildPlugin from "@badeball/cypress-cucumber-preprocessor/esbuild";
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
import "dotenv/config"; // npm i -D dotenv

export default defineConfig({
  e2e: {
    // 🌍 URL base de la APLICACIÓN (lo que se abre con cy.visit('/'))
    baseUrl: process.env.BASE_URL || "https://candidates-qa.contalink.com",

    // 👇 Busca features y tests .cy.ts
    specPattern: [
      "features/**/*.feature",
      "cypress/e2e/**/*.feature",
      "**/*.cy.{js,jsx,ts,tsx}",
    ],

    supportFile: "cypress/support/e2e.ts",
    video: true,
    viewportWidth: 1366,
    viewportHeight: 768,
    chromeWebSecurity: false,

    // 🔁 reintentos
    retries: { runMode: 2, openMode: 0 },

    env: {
      // 🔐 Token de auth para tus cy.request al API
      AUTH_TOKEN:
        process.env.AUTH_TOKEN ||
        process.env.ACCESS_CODE || // por si lo nombraste así
        "UXTY789@!!1",

      // 👤 código de acceso que escribe el step de login en el input #access-code
      ACCESS_CODE:
        process.env.ACCESS_CODE ||
        "UXTY789@!!1",

      // 📦 prefijo del API
      BASE_PATH: process.env.BASE_PATH || "/V1",

      // 🌐 dominio del API (lo usas en cy.request)
      API_BASE_URL:
        process.env.API_BASE_URL ||
        "https://candidates-api.contalink.com",

      // 🧾 datos de prueba por defecto
      INVOICE_NUMBER: process.env.INVOICE_NUMBER || "FACTURA-CRIS",
      INVOICE_TOTAL: Number(process.env.INVOICE_TOTAL || "100"),
      INVOICE_STATUS: process.env.INVOICE_STATUS || "Vigente",
    },

    async setupNodeEvents(on, config) {
      // 🥒 Cucumber + esbuild
      await addCucumberPreprocessorPlugin(on, config);
      on(
        "file:preprocessor",
        createBundler({
          plugins: [createEsbuildPlugin(config)],
        })
      );

      // 🚀 Ajustes de navegador
      on("before:browser:launch", (browser, launchOptions) => {
        if (browser.family === "chromium") {
          launchOptions.args.push(
            "--ignore-certificate-errors",
            "--allow-insecure-localhost",
            "--allow-running-insecure-content",
            "--disable-web-security",
            "--disable-features=BlockInsecurePrivateNetworkRequests,InsecurePrivateNetworkRequestsAllowed"
          );
        }
        if (browser.name === "electron") {
          // @ts-ignore
          launchOptions.preferences = {
            ...(launchOptions.preferences || {}),
            webSecurity: false,
            allowRunningInsecureContent: true,
          };
        }
        return launchOptions;
      });

      return config;
    },
  },
});