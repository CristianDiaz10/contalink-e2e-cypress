# language: en
Feature: Logout

  Scenario: Cerrar sesión desde el dashboard
    Given que abro la app
    When ingreso el código de acceso válido
    And debo ver el dashboard
    And hago logout
    Then debo regresar a la pantalla de acceso