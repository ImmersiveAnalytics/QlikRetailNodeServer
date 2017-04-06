const qsocks = require('qsocks');
var express = require('express');
var ExpressApp = express();
var bodyParser = require('body-parser');
var fs = require("fs");

var Products = {};
var global, senseApp, fields = {};
fields["ShelfNum"] = {};
fields["ShelfLoc"] = {};

/**** Create Web Server to handle requests to/from Unity ****/
var urlencodedParser = bodyParser.urlencoded({ extended: false });

// Get list of projects
ExpressApp.post('/listProducts', urlencodedParser, function (req, res) {
   // console.log( Products );
   console.log("listing " + Object.keys(Products).length + " Products");
   res.end(JSON.stringify(Products));
});

// Get field states
ExpressApp.post('/getFieldStates', urlencodedParser, function (req, res) {
   console.log( fields );
   res.end(JSON.stringify(fields));
});

// Filter
ExpressApp.post('/filter', urlencodedParser, function (req, res) {
    var field = req.body.fieldName;
    var value = req.body.fieldValue;
    console.log("Selecting "+value+" in "+field);
    filter(field, value);
    res.end("filtered");
});

// Clear Selections
ExpressApp.post('/clear', urlencodedParser, function (req, res) {
    console.log("Clearing Selections");
    clear();
    res.end("cleared");
});

// Test
ExpressApp.get('/test', function (req, res) {
    console.log("TEST");
    res.end("test");
});


// Start Server
var server = ExpressApp.listen(8083, '172.100.19.130', 511, function () {
  var host = server.address().address;
  var port = server.address().port;

  // console.log("server", host);
  console.log("Retail middleware service listening on http://%s:%s", host, port);
});


/**** Connect to Qlik App via Virtual Proxy ****/
// var config = {
//     host: 'rdmobile.qlikemm.com',
//     isSecure: true,
//     origin: 'localhost',
//     rejectUnauthorized: true,
//     appname: '06f6fb54-1ee0-4903-a69d-9f85e663084d' // Retail
// };


/**** Connect to Qlik App via Proxy using certificates ****/
const client = fs.readFileSync('client.pem');
const client_key = fs.readFileSync('client_key.pem');

const config = {
    host: 'localhost',
    port: 4747, // Standard Engine port
    isSecure: true,
    headers: {
        'X-Qlik-User': 'UserDirectory=Internal;UserId=sa_repository' // Passing a user to QIX to authenticate as
    },
    key: client_key,
    cert: client,
    rejectUnauthorized: false, // Don't reject self-signed certs
    appname: '06f6fb54-1ee0-4903-a69d-9f85e663084d' // Retail

};

qsocks.ConnectOpenApp(config).then(function(connections) {
	global	= connections[0];
	senseApp= connections[1];
    console.log("got senseApp");

    // Sankey Cube
    senseApp.createSessionObject({
        "qInfo": {
            "qType": 'myProjectCube'
        },
        "qHyperCubeDef": {
			"qInitialDataFetch": [
				{
					"qHeight": 3000,
					"qWidth": 3
				}
			],
			"qDimensions": [
				{
					"qDef" : {
						"qFieldDefs" : ["Product Name"]
					}
				},
				{
					"qDef" : {
						"qFieldDefs" : ["Affinity Product"]
					}
				}
			],
			"qMeasures": [
                {
                    qDef: {
                        qLabel: 'Sales',
                        qDef: '=Sum([Sales TY])'
                    },
                    qSortBy: {qSortByNumeric: 1}
                }
			],
			// "qSuppressZero": false,
			"qSuppressMissing": true,
			// "qMode": "S",
			// "qInterColumnSortOrder": [],
			"qStateName": "$"
		}
	}).then(function(prodModel){
		prodModel.getLayout().then(function(layout) {
			// console.log("got app layout",JSON.stringify(layout));
            var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
            // console.log("data",JSON.stringify(qMatrix));
            for(i=0; i<qMatrix.length; i++){
	            p = qMatrix[i][0].qText;
	            a = qMatrix[i][1].qText;
	            s = qMatrix[i][2].qNum;

                if(!(Products.hasOwnProperty(p))){
                	Products[p] = {};
                }

                if(!(Products[p].hasOwnProperty('affinities'))){
                	Products[p].affinities = [a];
                }else{
                	Products[p].affinities.push(a);
                }

                Products[p].sales = s;
            }
            console.log("got " + Object.keys(Products).length + " Products");
        });

        prodModel.on('change', function(layout) {
        	prodModel.getLayout().then(function(layout) {
				// console.log("got new data",JSON.stringify(layout));
	            var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
	            // console.log("data",JSON.stringify(qMatrix));
	            Products = {};
	            for(i=0; i<qMatrix.length; i++){
		            p = qMatrix[i][0].qText;
		            a = qMatrix[i][1].qText;
		            s = qMatrix[i][2].qNum;

	                if(!(Products.hasOwnProperty(p))){
	                	Products[p] = {};
	                }

	                if(!(Products[p].hasOwnProperty('affinities'))){
	                	Products[p].affinities = [a];
	                }else{
	                	Products[p].affinities.push(a);
	                }

	                Products[p].sales = s;
	            }
	            console.log("Cube updated. Now " + Object.keys(Products).length + " Products");
	        });
        });
	});

	// Fields Table
    var ListObjDefs = {
        "qInfo": {
        	"qId": "CB04",
            "qType": 'Combo'
        },
        "ListObject1": {
			"qListObjectDef": {
				"qStateName": "$",
				"qLibraryId": "",
				"qDef": {
					"qFieldDefs" : ["Shelf Number"],
					"qSortCriterias": [{
						"qSortByAscii": -1
					}],
					"qFieldLabels": ["Shelf Number"]
				},
				"qInitialDataFetch": [
	                {
	                    "qTop": 0,
	                    "qLeft": 0,
	                    "qHeight": 10,
	                    "qWidth": 2,
	                }
	            ],
	            "qShowAlternatives": true
			}
        },
        "ListObject2": {
			"qListObjectDef": {
				"qStateName": "$",
				"qLibraryId": "",
				"qDef": {
					"qFieldDefs" : ["Shelf Location"],
					"qSortCriterias": [{
						"qSortByAscii": -1
					}],
					"qFieldLabels": ["Shelf Location"]
				},
				"qInitialDataFetch": [
	                {
	                    "qTop": 0,
	                    "qLeft": 0,
	                    "qHeight": 10,
	                    "qWidth": 2,
	                }
	            ],
	            "qShowAlternatives": true
			}
        }
    };

    senseApp.createSessionObject(ListObjDefs).then(function(list){
		list.getLayout().then(function(layout) {
            var qMatrix = layout.ListObject1.qListObject.qDataPages[0].qMatrix;
            for(i=0; i<qMatrix.length; i++){
	            console.log(qMatrix[i][0].qText, qMatrix[i][0].qState);
	            fields.ShelfNum[qMatrix[i][0].qText] = qMatrix[i][0].qState;
			}

            var qMatrix = layout.ListObject2.qListObject.qDataPages[0].qMatrix;
            for(i=0; i<qMatrix.length; i++){
	            console.log(qMatrix[i][0].qText, qMatrix[i][0].qState);
	            fields.ShelfLoc[qMatrix[i][0].qText] = qMatrix[i][0].qState;
            }

        });

        list.on('change', function(layout) {
        	list.getLayout().then(function(layout) {
				console.log("Shelf Number",layout.ListObject1.qListObject.qDimensionInfo.qStateCounts.qExcluded);
	            var qMatrix = layout.ListObject1.qListObject.qDataPages[0].qMatrix;
	            for(i=0; i<qMatrix.length; i++){
		            fields.ShelfNum[qMatrix[i][0].qText] = qMatrix[i][0].qState;
	            }

				console.log("Shelf Location",layout.ListObject2.qListObject.qDimensionInfo.qStateCounts.qExcluded);
	            var qMatrix = layout.ListObject2.qListObject.qDataPages[0].qMatrix;
	            for(i=0; i<qMatrix.length; i++){
		            fields.ShelfLoc[qMatrix[i][0].qText] = qMatrix[i][0].qState;
	            }
	        });
        });
	});

}).catch(function(err){
	console.log(err);
})


// Fetch a field
function filter(fieldName, fieldValue){
    senseApp.getField("["+fieldName+"]").then(function(field) {
        // Issue a selection on the field handle.
        field.select(fieldValue, false, 1).then(console.log, console.log); 
    });
}

// Clear Selections
function clear(){
    senseApp.clearAll().then(function() {
        console.log("Cleared selections");
        // reset();
    });
}

// Reset Selections
function reset(){
    senseApp.getField("[First Procedure]").then(function(field) {
//        field.select("1 INT MAM-COR ART BYPASS").then(console.log, console.log); 
        field.select("ALVEOLOPLASTY").then(console.log, console.log); 
    });
}
