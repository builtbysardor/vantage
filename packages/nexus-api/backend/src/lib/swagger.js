'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nexus Pro API',
      version: '2.0.0',
      description: 'Real-time network and infrastructure monitoring API',
    },
    servers: [{ url: '/api', description: 'Default server' }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: [require('path').join(__dirname, '../routes/index.js')],
};

module.exports = swaggerJsdoc(options);
