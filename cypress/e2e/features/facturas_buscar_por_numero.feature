# language: en
Feature: Facturas - Buscar por número

  Scenario: Buscar FACTURA-CRIS
    Given que abro la app
    When ingreso el código de acceso válido
    When busco la factura por número
    Then debo ver FACTURA-CRIS en los resultados