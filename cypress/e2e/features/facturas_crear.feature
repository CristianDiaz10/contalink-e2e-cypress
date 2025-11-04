# language: es
Característica: Facturas - Crear
  Escenario: Crear FACTURA-CRIS vigente
    Dado que abro la app
    Cuando ingreso el código de acceso válido
    Cuando creo una nueva factura válida
    Entonces debo ver la factura creada en la lista con estado Vigente