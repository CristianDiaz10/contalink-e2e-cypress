@api @invoices
Feature: API Invoices (V1) - Flujo principal

  Background:
    Given el basePath de la API es "/V1/invoices"

  # 1) GET por factura (con filtro)
  @get @filter
  Scenario: TC01 - Listar por invoice_number
    When hago GET a "/V1/invoices?page=1&invoice_number=FAC-7081986" con token
    Then la respuesta debe tener status 200
    And el cuerpo debe incluir un arreglo "invoices"
    And si "invoices" tiene elementos, el primero debe tener:
      | invoiceNumber | FAC-7081986 |

  # 2) GET general (sin filtro)
  @get @general
  Scenario: TC02 - Listar general page=1
    When hago GET a "/V1/invoices?page=1" con token
    Then la respuesta debe tener status 200
    And el cuerpo debe incluir un arreglo "invoices"

  # 3) POST crear factura válida
  @post @happy
  Scenario: TC03 - Crear factura válida (201)
    Given el payload de creación es:
      """
      {
        "invoice_number":"FAC-7081986",
        "total":300,
        "invoice_date":"16/07/2025 10:01 PM",
        "status":"Vigente",
        "active":true
      }
      """
    When hago POST a "/V1/invoices" con ese payload y token
    Then la respuesta debe tener status 201
    And la respuesta debe reflejar los campos del payload tolerante a camelCase o snake_case

  # 4) POST crear factura negativa (espera 422)
  @post @negative
  Scenario: TC04 - Crear factura con total negativo (422)
    Given el payload de creación es:
      """
      {
        "invoice_number":"FAC-7081986",
        "total":-300,
        "invoice_date":"16/07/2025 10:01 PM",
        "status":"Vigente",
        "active":true
      }
      """
    When hago POST a "/V1/invoices" con ese payload y token (permitiendo 4xx)
    Then la respuesta debe tener status 422

  # 5) GET por factura sin token
  @get @auth
  Scenario: TC05 - Listar por invoice_number sin token
    When hago GET a "/V1/invoices?page=1&invoice_number=FAC-7081986" sin token (permitiendo 4xx)
    Then la respuesta debe tener status 401

  # 6) DELETE id 9530
  @delete
  Scenario: TC06 - Eliminar 9530 (no existe)
    When hago DELETE a "/V1/invoices/9530" con token (permitiendo 4xx)
    Then la respuesta debe tener status 404
    And el cuerpo debe tener la propiedad "error" con valor "Factura no encontrada"

  # 7) PUT id 9535
  @put
  Scenario: TC07 - Actualizar 9535 (puede existir o no)
    Given el payload de actualización es:
      """
      {
        "total":350,
        "status":"Vigente",
        "active":true
      }
      """
    When hago PUT a "/V1/invoices/9535" con ese payload y token (permitiendo 4xx)
    Then la respuesta debe tener status en [200, 404]