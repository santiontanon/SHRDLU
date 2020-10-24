// get a new Session ID in a token and assign it to this game
function assignNewSessionID(game:ShrdluA4Game) {
    requestTokenFromServer((err:string, token:string) => {
       if (err) {
           console.log(err);
       } else if (token != null && game != null) {
           game.serverToken = token;
       }
    });
}


// requests from the server an authenticated token with a new UUID for this gameplay session
function requestTokenFromServer(callback:(err:string, token:string) => void) {
    let xhr = ((<any>window).XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
    xhr.onload = function () {
        if (this.status === 200) {
            let json = JSON.parse(this.response);
            if (json.hasOwnProperty('token')) {
                return callback(null, json.token);
            }
        }
        return callback('Could not retrieve token', null);
    };
    xhr.open("GET", 'session');
    xhr.send();
}


function writeLogToServer(game:ShrdluA4Game) {
    let token:string = game.serverToken;
    if (!token) return;
    let xhr = ((<any>window).XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
    xhr.onload = function () {
        if (this.status !== 201) console.log('Could not record debug log to server');
    };
    xhr.open("POST", 'session');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.send('data=' + generateDebugLog(game, true));
}


// extract the Session ID (UUID) from the server-provided authentication token
function getIDFromSessionToken(token:string) {
    try {
        let decoded = token.split('.')[1].replace('-', '+').replace('_', '/');
        let json = JSON.parse((<any>window).atob(decoded));
        return json.sessionID;
    } catch (e) {
        return '';
    }
}
