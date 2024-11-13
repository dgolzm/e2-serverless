const AWS = require('aws-sdk');
const PDFDocument = require('pdfkit');
const { Buffer } = require('buffer');

// Inicializar el cliente de S3
const s3 = new AWS.S3();

const generatePDF = async (event) => {
  try {
    // if (!event.body) {
    //   throw new Error('No se recibió ningún cuerpo en la solicitud (body es undefined)');
    // }

    console.log("Event", event);

    const { datetime, fixture_id, league_name, result, odds_name, quantity, round, seller, username, email } = JSON.parse(event);

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
      doc.fontSize(14).text(`Usuario: ${username}`);
      doc.fontSize(14).text(`Email: ${email}`);
      doc.moveDown();
      doc.fontSize(14).text(`Información del Bono:`);
      doc.fontSize(12).text(`Fixture ID: ${fixture_id}`);
      doc.fontSize(12).text(`Liga: ${league_name}`);
      doc.fontSize(12).text(`Ronda: ${round}`);
      doc.fontSize(12).text(`Tipo de resultado: ${odds_name}`);
      doc.fontSize(12).text(`Resultado: ${result}`);
      doc.fontSize(12).text(`Cantidad de bonos: ${quantity}`)
      doc.fontSize(12).text(`ID Vendedor: ${seller}`);
      doc.fontSize(12).text(`Fecha: ${datetime}`);

      doc.end();
    });

    const bucketName = 'coolgoat-pdf-storage';  // Nombre del bucket de S3
    const key = `boletas/${username}-${Date.now()}.pdf`;

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

