export function openApiSkeleton(): string {
  return `openapi: 3.1.0
info:
  title: UNDECIDED Resource API
  version: 0.0.0
servers:
  - url: https://api.example.invalid
    description: UNDECIDED
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
  parameters:
    Limit:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 25
    Cursor:
      name: cursor
      in: query
      schema:
        type:
          - string
          - "null"
    IdempotencyKey:
      name: Idempotency-Key
      in: header
      required: true
      schema:
        type: string
  schemas:
    Resource:
      type: object
      required: [id, type]
      properties:
        id:
          type: string
        type:
          type: string
          const: Resource
    CreateResourceRequest:
      type: object
      required: [type]
      properties:
        type:
          type: string
          const: Resource
    SuccessResponse:
      type: object
      required: [data]
      properties:
        data:
          $ref: "#/components/schemas/Resource"
    PaginatedResponse:
      type: object
      required: [data, page]
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/Resource"
        page:
          type: object
          required: [limit, nextCursor]
          properties:
            limit:
              type: integer
              minimum: 1
              maximum: 100
            nextCursor:
              type:
                - string
                - "null"
    ErrorResponse:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
            message:
              type: string
            requestId:
              type: string
security:
  - bearerAuth: []
paths:
  /health:
    get:
      security: []
      responses:
        "200":
          description: Health check
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    const: ok
  /v1/resources:
    get:
      parameters:
        - $ref: "#/components/parameters/Limit"
        - $ref: "#/components/parameters/Cursor"
      responses:
        "200":
          description: List resources
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PaginatedResponse"
    post:
      parameters:
        - $ref: "#/components/parameters/IdempotencyKey"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateResourceRequest"
      responses:
        "201":
          description: Create resource
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SuccessResponse"
        default:
          description: Error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
  /v1/resources/{resourceId}:
    get:
      parameters:
        - name: resourceId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Get resource
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SuccessResponse"
        default:
          description: Error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
`;
}

export function dbml(): string {
  return `Table users {
  id uuid [pk]
  email varchar [not null, unique]
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

Table organizations {
  id uuid [pk]
  name varchar [not null]
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

Table organization_members {
  organization_id uuid [not null, ref: > organizations.id]
  user_id uuid [not null, ref: > users.id]
  role varchar [not null]
  created_at timestamp [not null]

  indexes {
    (organization_id, user_id) [pk]
    user_id
    (organization_id, role)
  }
}
`;
}
