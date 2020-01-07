// API endpoints for the server

const fs = require('fs');
const path = require('path');
const uuidv4 = require('uuid/v4');
const expressJwt = require('express-jwt');
const httpStatus = require('http-status');
const util = require('./utilities');

const routes = function(app) {

	/// Unsecured Endpoints (no JWT required)
	/// ********************************************

	// main SPA
	app.get('/', (req, res) => {
		res.sendFile(path.join(__dirname, '..', 'built', 'shrdlu.html'));
	});

	// environment variables set in .env that the frontend might need
	app.get('/env.js', (req, res) => {
		res.status(httpStatus.OK).send('(function(){window.BASE_URL="' + process.env.URL + '";})();');
	});

	// test API
	app.get('/test', (req, res) => {
		res.status(httpStatus.OK).json({message: "API test endpoint"});
	});

	// create a new playtest session and issue JWT
	app.get('/session', (req, res, next) => {
		// when a user starts a new game, the client applies for a session ID from the server.
		// this allows us to manage this user through a token that we authenticate,
		// which makes security easier later when we are receiving and recording log data for this session

		// issue a random, unique ID for this session
		const sessionID = uuidv4();
		const ret = {
			token: util.createAuthToken(sessionID)
		};
		res.status(httpStatus.OK).json(ret);
	});

	/// Secured Endpoints (requires JWT)
	/// ********************************************

	// this will cover all further defined endpoints and require they have a valid JWT or will error 401
	// once validated, token will be saved to req.token in the endpoints below
	app.use(
		expressJwt({
			secret: process.env.JWT_SECRET,
			getToken: util.getToken,
			requestProperty: 'token'
		})
	);

	// post log data for a playtest session based on issued sessionID
	app.post('/session', (req, res, next) => {
		if (!req.body.data) {
			return next(util.error(400, "No Data specified", "No data specified"));
		}
		// !!!: note that session ID is used here to create a filename, and usually would require heavy sanitization
		// However, we know from the JWT signature authentication that the sessionID we are reading from the token is
		// something that was issued by us via '/session' endpoint, and is therefore safe.
		let sessionID = req.token.sessionID;

		// find existing file or create a new one
		let logdir = path.join(__dirname, 'logs');
		// not efficient, but better than failing to capture a log
		if (!fs.existsSync(logdir)) {
			fs.mkdirSync(logdir);
		}
		let sessionFile = path.join(logdir, sessionID + '.' + util.currentEpochTime() + '.log');
		// write the file.  fs.writeFile() handles input sanitization
		fs.writeFile(sessionFile, req.body.data, { flag: 'wx' }, (err) => {
			if (err) {
				// 'wx' flag causes failure if the file exists - but would be very strange for this file to exist already!
				return next(util.error(500, "Data not recorded", "An internal error has occurred and data was not saved"));
			}
			// else return success
			return res.status(201).end();
		});
	});

};

module.exports = routes;
