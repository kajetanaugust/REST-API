'use strict';

// load modules
const express = require('express');
const morgan = require('morgan');
const sequelize = require('./models').sequelize;


const userRoutes = require('./routes/user');
const courseRoutes = require('./routes/course');

// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

// create the Express app
const app = express();
app.use(express.json());
// setup morgan which gives us http request logging
app.use(morgan('dev'));

////////////////////////////////////////
// testing connection to the database///
////////////////////////////////////////
console.log('Testing the connection to the database...');
(async () => {
  try {
    // all asynchronous calls made with Sequelize
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Connection to the database successful!');
  } catch(error) {
    // catch and display Sequelize validation errors
    console.log('Connection to the database failed!');
    throw error;
  }
})();

// TODO setup your api routes here

app.use('/api', userRoutes);
app.use('/api', courseRoutes);

// greeting for the root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the REST API project!',
  });
});

// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

// global error handler
app.use((error, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(error.stack)}`);
  }
  res.status(error.status || 500).json({
    message: error.message,
    error: {},
  });
});



// set our port
app.set('port', process.env.PORT || 5000);

// start listening on our port
const server = app.listen(app.get('port'), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});
