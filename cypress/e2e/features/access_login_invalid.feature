# language: en
Feature: Acceso con código inválido

  Scenario: Mostrar error con código inválido
    Given que abro la app
    When ingreso un código de acceso inválido "123"
    Then debo ver un mensaje de error de acceso