// Node.js server entry point

const http = require('http');
const debug = require('debug')('shrdlu:server');
const app = require('./app');

let server;

// event listener for http server error event
function onError(error) {
	console.log(error);
	if (error.syscall !== 'listen') {
		throw error;
	}
	const bind = typeof port === 'string'
		? 'Pipe ' + process.env.PORT
		: 'Port ' + process.env.PORT;
	// handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			console.error(bind + ' requires elevated privileges');
			process.exit(1);
			break;
		case 'EADDRINUSE':
			console.error(bind + ' is already in use');
			process.exit(1);
			break;
		default:
			throw error;
	}
}

// event listener for http server listening event
function onListening() {
	const addr = server.address();
	const bind = typeof addr === 'string'
		? 'pipe ' + addr
		: 'port ' + addr.port;
	debug('Listening on ' + bind);
}

// create http server
function createServer(callback) {
	server = http.createServer(app);//https.createServer(cert, app);
	server.on('error', onError);
	server.on('listening', onListening);

	server.listen(process.env.PORT, callback(server));
}

module.exports = createServer;
