# language: es
Característica: Facturas - Eliminar
  Escenario: Eliminar FACTURA-CRIS
    Dado que abro la app
    Cuando ingreso el código de acceso válido
    Y busco la factura por número
    Cuando elimino la factura FACTURA-CRIS
    Entonces la factura debe eliminarse o quedar con estado Eliminada