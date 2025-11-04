# language: en
Feature: Facturas - Crear

  Scenario: Crear FACTURA-CRIS vigente
    Given que abro la app
    When ingreso el código de acceso válido
    And creo una nueva factura válida
    Then debo ver la factura creada en la lista con estado Vigente