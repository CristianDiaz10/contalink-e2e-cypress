# language: en
Feature: Facturas - Filtro incluir eliminadas

  Scenario: Buscar con "Incluir facturas eliminadas"
    Given que abro la app
    When ingreso el código de acceso válido
    And activo incluir facturas eliminadas y busco
    Then deben mostrarse facturas eliminadas en los resultados