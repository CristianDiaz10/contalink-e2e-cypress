# language: en
Feature: Facturas - Eliminar

  Scenario: Eliminar FACTURA-CRIS
    Given que abro la app
    When ingreso el código de acceso válido
    And busco la factura por número
    And elimino la factura FACTURA-CRIS
    Then la factura debe eliminarse o quedar con estado Eliminada