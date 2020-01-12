// utilities and helpful functions for the server

const jwt = require('jsonwebtoken');

// returns the token from the request header (authorization: 'Bearer ...')
function getToken(req) {
	if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
		return req.headers.authorization.split(' ')[1];
	}
	return null;
}

// create authentication token json to return to the user
function createAuthToken(sessionID) {
	let data = {
		sessionID
	};
	let token = jwt.sign(data, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRATION_SECONDS});
	return token;
}

// returns the current time (+ msOffset) as ISO string
function currentEpochTime(msOffset) {
	let nowDate = new Date();
	if (msOffset) {
		nowDate.setMilliseconds(nowDate.getMilliseconds() + msOffset);
	}
	return nowDate.getTime();
}

// creates an error object
function error(status, message, title) {
	let ret = new Error(message);
	ret.status = status;
	ret.title = title || "Error";
	return ret;
}

module.exports = {
	getToken,
	createAuthToken,
	currentEpochTime,
	error
};
