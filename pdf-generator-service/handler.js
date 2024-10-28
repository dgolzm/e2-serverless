const AWS = require('aws-sdk');
const PDFDocument = require('pdfkit');
const { Buffer } = require('buffer');

// Inicializar el cliente de S3
const s3 = new AWS.S3();

const generatePDF = async (event) => {
  try {
    // Verificar si el body está definido
    if (!event.body) {
      throw new Error('No se recibió ningún cuerpo en la solicitud (body es undefined)');
    }

    // Parsear los datos que vienen en el body de la solicitud
    const { userName, groupName, fixtureDetails } = JSON.parse(event.body);

    if (!userName || !groupName || !fixtureDetails) {
      throw new Error('Faltan datos en el body de la solicitud');
    }

    // Crear un nuevo documento PDF
    const doc = new PDFDocument();
    let buffers = [];

    // Manejar el flujo del PDF para almacenarlo en un buffer
    doc.on('data', buffers.push.bind(buffers));

    doc.on('end', () => {
      // Concatenar buffers y luego manejar el PDF de manera asíncrona
      const pdfData = Buffer.concat(buffers);
      return {
        statusCode: 200,
        body: event.body,
      };
      // Ejecutar una función asíncrona para manejar la subida a S3
      // handleUploadToS3(pdfData, userName)
      //   .then((downloadUrl) => {
      //     console.log(`Trabajo completado. URL de descarga: ${downloadUrl}`);
      //   })
      //   .catch((error) => {
      //     console.error('Error subiendo el archivo a S3:', error);
      //   });
    });
    
    // Mueve la lógica asíncrona a una función separada
    const handleUploadToS3 = async (pdfData, userName) => {
      const bucketName = 'coolgoat-pdf-storage';
      const key = `boletas/${userName}-${Date.now()}.pdf`;
    
      const params = {
        Bucket: bucketName,
        Key: key,
        Body: pdfData,
        ContentType: 'application/pdf',
        ACL: 'public-read',
      };
    
      // Subir el archivo PDF a S3
      await s3.upload(params).promise();
    
      // Generar el enlace de descarga
      const downloadUrl = `https://${bucketName}.s3.amazonaws.com/${key}`;

      return {
        statusCode: 200,
        body: JSON.stringify({ downloadUrl }),
      };
    };

    // Añadir contenido al PDF
    doc.fontSize(20).text('Boleta de Compra', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Grupo: ${groupName}`);
    doc.fontSize(14).text(`Usuario: ${userName}`);
    doc.moveDown();
    doc.fontSize(14).text(`Información del Partido:`);
    doc.fontSize(12).text(`Equipo Local: ${fixtureDetails.homeTeam}`);
    doc.fontSize(12).text(`Equipo Visitante: ${fixtureDetails.awayTeam}`);
    doc.fontSize(12).text(`Fecha: ${fixtureDetails.date}`);

    // Finalizar el documento

    doc.end();

  } catch (error) {
    // Registrar detalles completos del error
    console.error('Error generando la boleta PDF:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error generando la boleta PDF',
        message: error.message,
        stack: error.stack
      }),
    };
  }
};

// Exportar la función para AWS Lambda
module.exports = {
  generatePDF
};

