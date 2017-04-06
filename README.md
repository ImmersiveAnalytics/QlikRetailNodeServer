# QlikRetailNodeServer
Middleware node.js server to pass data between a Qlik app and a Unity 3D app

It has the following webhooks:
* http://pe.qlik.com:8083/listProducts returns a json object containing an array of products with their associated affinities & sales totals
* http://pe.qlik.com:8083/filter which allows you to select anything in the app (E.g. shelf number, or product name)
* http://pe.qlik.com:8083/clear which clears all selections

all calls are POST

_You'll need to supply your own client and client key pem files_
