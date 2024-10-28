const AWS = require('aws-sdk');
const PDFDocument = require('pdfkit');
const { Buffer } = require('buffer'); // Asegúrate de importar Buffer

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
    
    // Promesa para esperar la finalización del PDF
    const pdfData = await new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        if (pdfBuffer.length === 0) {
          reject(new Error('El PDF está vacío o no se generó correctamente'));
        } else {
          resolve(pdfBuffer);
        }
      });

      doc.on('error', (error) => {
        reject(new Error('Error durante la generación del PDF: ' + error.message));
      });

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
    });

    // Configurar los parámetros para almacenar el PDF en S3
    const bucketName = 'coolgoat-pdf-storage';  // Nombre del bucket que creaste en S3
    const key = `boletas/${userName}-${Date.now()}.pdf`;

    const params = {
      Bucket: bucketName,
      Key: key,
      Body: pdfData,
      ContentType: 'application/pdf',
      ACL: 'public-read', // Permitir acceso público
    };

    // Subir el archivo PDF a S3
    await s3.upload(params).promise();

    // Generar el enlace de descarga
    const downloadUrl = `https://${bucketName}.s3.amazonaws.com/${key}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ downloadUrl }),
    };

  } catch (error) {
    // Registrar detalles completos del error
    console.error('Error generando la boleta PDF:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error generando la boleta PDF',
        message: error.message,
        stack: error.stack,
      }),
    };
  }
};

// Exportar la función para AWS Lambda
module.exports = {
  generatePDF,
};
