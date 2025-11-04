# language: es
Característica: Facturas - Filtro incluir eliminadas
  Escenario: Buscar con "Incluir facturas eliminadas"
    Dado que abro la app
    Cuando ingreso el código de acceso válido
    Y activo incluir facturas eliminadas y busco
    Entonces deben mostrarse facturas eliminadas en los resultados