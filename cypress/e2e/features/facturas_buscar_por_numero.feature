# language: es
Característica: Facturas - Buscar por número
  Escenario: Buscar FACTURA-CRIS
    Dado que abro la app
    Cuando ingreso el código de acceso válido
    Cuando busco la factura por número
    Entonces debo ver FACTURA-CRIS en los resultados