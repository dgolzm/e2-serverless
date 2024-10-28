<!--
title: 'AWS NodeJS Example'
description: 'This template demonstrates how to deploy a simple NodeJS function running on AWS Lambda using the Serverless Framework.'
layout: Doc
framework: v4
platform: AWS
language: nodeJS
priority: 1
authorLink: 'https://github.com/serverless'
authorName: 'Serverless, Inc.'
authorAvatar: 'https://avatars1.githubusercontent.com/u/13742415?s=200&v=4'
-->

# Serverless Framework AWS NodeJS

Esta documentación muestra como se utiliza Serverless para el ofrecimiento de un servicio de generación de boletas en archivos PDF desde AWS Lambda.

## Uso

### Deployment

Una vez instalado serverless, para poder hacer el deploy correctamente se debe correr el siguiente comando:

```
serverless deploy
```

La respuesta esperada es la siguiente:

```
Deploying "pdf-generator-service" to stage "dev" (us-east-1)

✔ Service deployed to stack pdf-generator-service-dev (58s)

endpoint: POST - https://q6cwp910i7.execute-api.us-east-1.amazonaws.com/dev/generate-pdf
functions:
  generatePDF: pdf-generator-service-dev-generatePDF (30 MB)
```

### Invoke

Para poder llamar a la función se le debe proporcionar una request cuyo body debe lucir así (por ejemplo):

```json
{
  "userName": "Juan Perez",
  "groupName": "Grupo 3",
  "fixtureDetails": {
    "homeTeam": "Team A",
    "awayTeam": "Team B",
    "date": "2024-09-30T22:00:00.000Z"
  }
}
```
Podemos hacer esta request directamente desde bash con el siguiente comando


```bash
curl -X POST https://q6cwp910i7.execute-api.us-east-1.amazonaws.com/dev/generate-pdf -H "Content-Type: application/json" -d '{
  "userName": "Juan Perez",
  "groupName": "Grupo A",
  "fixtureDetails": {
    "homeTeam": "Team A",
    "awayTeam": "Team B",
    "date": "2024-09-30T22:00:00.000Z"
  }
}'
```

Donde el enlace https://q6cwp910i7.execute-api.us-east-1.amazonaws.com/dev/generate-pdf se debe reemplazar de acuerdo al endpoint retornado al hacer el deploy. La respuesta esperada debería verse algo así:

```
{"downloadUrl":"https://coolgoat-pdf-storage.s3.amazonaws.com/boletas/Juan%20Perez-1730136053051.pdf?AWSAccessKeyId=ASIATBRPQHJMSZK7SQUZ&Expires=1730139653&Signature=M4DclgcOKkhMaXtQFVpMUBN3Py0%3D&X-Am... (enlace es GIGANTE)
```

El cual de acuerdo a las configuraciones definidas en `handler.js` es un enlace válido por 1 hora, y muestra un archivo PDF disponible para descarga con la información entregada en la request.

## Explicación de archivos

### `handler.js`

El archivo `handler.js` contiene la lógica de la función que se ejecutará en AWS Lambda. La función es responsable de generar un PDF con la información proporcionada, subirlo a un bucket de S3 y devolver un enlace de descarga. Utiliza 3 librerías:

- `AWS SDK`: Para interactuar con S3
- `PDFKit`: Para la generación del archivo PDF
- `Buffer`: Para el manejo de datos del archivo antes de subirse al bucket S3.

### `serverless.yml`

Este archivo define cómo se va a desplegar la función en AWS Lambda usando *Serverless Framework*. Sirve esencialmente para definir la infraestructura y el despliegue de nuestra función sin tener que configurar manualmente cada recurso.
