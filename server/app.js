// main backend/server application entry point

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const httpStatus = require('http-status');
const path = require('path');

require('dotenv').config();

// app setup
const app = express();
app.set('port', process.env.PORT);
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(cors());

// by default, we serve URL requests from the TS build output directory
app.use(express.static(path.join(__dirname, '..', 'built')));

// routes
require('./routes')(app);

// catch any remaining path (not found) and forward to error handler
app.use((req, res, next) => {
	const err = new Error('Not Found');
	err.status = httpStatus.NOT_FOUND;
	next(err);
});

// return the full error object in development
const getError = function(err) {
	if (process.env.NODE_ENV === 'dev') {
		return { error: err, message: err.message };
	} else {
		return null;
	}
};

// error on /session (no JWT) should return json error
app.use('/session', (err, req, res, next) => {
	res.status(err.status || httpStatus.NOT_FOUND);
	const errorJson = getError(err) || { error: err.message };
	res.json(errorJson);
});

// all other web errors return our app
app.use((err, req, res, next) => {
	res.sendFile(path.join(__dirname, '..', 'built', 'shrdlu.html'));
});

module.exports = app;
