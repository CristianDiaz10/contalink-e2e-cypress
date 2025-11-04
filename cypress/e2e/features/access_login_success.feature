# language: en
Feature: Acceso con código

  Scenario: Acceso exitoso con código válido
    Given que abro la app
    When ingreso el código de acceso válido
    Then debo ver el dashboard