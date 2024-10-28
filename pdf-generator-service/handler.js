const AWS = require('aws-sdk');
const PDFDocument = require('pdfkit');
const { Buffer } = require('buffer');

// Inicializar el cliente de S3
const s3 = new AWS.S3();

const generatePDF = async (event) => {
  try {
    if (!event.body) {
      throw new Error('No se recibió ningún cuerpo en la solicitud (body es undefined)');
    }

    const { userName, groupName, fixtureDetails } = JSON.parse(event.body);

    if (!userName || !groupName || !fixtureDetails) {
      throw new Error('Faltan datos en el body de la solicitud');
    }

    const doc = new PDFDocument();
    let buffers = [];

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
      doc.fontSize(14).text(`Grupo: 3`);
      doc.fontSize(14).text(`Usuario: ${userName}`);
      doc.moveDown();
      doc.fontSize(14).text(`Información del Partido:`);
      doc.fontSize(12).text(`Equipo Local: ${fixtureDetails.homeTeam}`);
      doc.fontSize(12).text(`Equipo Visitante: ${fixtureDetails.awayTeam}`);
      doc.fontSize(12).text(`Fecha: ${fixtureDetails.date}`);

      doc.end();
    });

    const bucketName = 'coolgoat-pdf-storage';  // Nombre del bucket de S3
    const key = `boletas/${userName}-${Date.now()}.pdf`;

    const params = {
      Bucket: bucketName,
      Key: key,
      Body: pdfData,
      ContentType: 'application/pdf',
    };

    // Subir el archivo PDF a S3
    await s3.upload(params).promise();

    // Esto genera el enlace de descarga usando una URL firmada
    const signedUrlParams = {
      Bucket: bucketName,
      Key: key,
      Expires: 60 * 60, // URL expira 1 hora después de ser generada
    };

    const downloadUrl = s3.getSignedUrl('getObject', signedUrlParams);

    return {
      statusCode: 200,
      body: JSON.stringify({ downloadUrl }),
    };

  } catch (error) {
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

module.exports = {
  generatePDF,
};

