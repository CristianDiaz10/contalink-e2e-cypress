# language: es
Característica: Logout
  Escenario: Cerrar sesión desde el dashboard
    Dado que abro la app
    Cuando ingreso el código de acceso válido
    Y debo ver el dashboard
    Cuando hago logout
    Entonces debo regresar a la pantalla de acceso