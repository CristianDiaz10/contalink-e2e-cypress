# language: es
Característica: Acceso con código inválido
  Escenario: Mostrar error con código inválido
    Dado que abro la app
    Cuando ingreso un código de acceso inválido "123"
    Entonces debo ver un mensaje de error de acceso