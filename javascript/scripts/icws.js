var inin_appname = "ICWS Queue Example";
var inin_credsCookie = 'IcwsQueueExapleCredsCookie';
var inin_messagePollInterval = 1000;
var inin_messagePollTimer;
var inin_sessionId = 'NO SESSION';
var inin_csrfToken = null;
var inin_server = '';
var inin_username = '';
var inin_password = '';

/****** IMMEDIATE SCRIPTS ******
 * These scripts are run as soon as this script file is loaded.
 */

// Ensure String.startsWith is a function
if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str){
        return this.slice(0, str.length) == str;
    };
}

// Ensure String.endsWith is a function
if (typeof String.prototype.endsWith != 'function') {
  String.prototype.endsWith = function (str){
    return this.slice(-str.length) == str;
  };
}



/****** GENERAL ******
 * These scripts provide general or multi-purpose functionality
 */

// Sets an error message in the UI
function setError(message) {
    if (message == undefined || message == '') {
        $('#inin-error').css('display', 'none');
        $('#inin-error').html('No error');
    } else {
        console.error(message);
        $('#inin-error').css('display', 'block');
        $('#inin-error').html(message);
    }
}

// Determines if the passed in value is a valid numeric value
function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

// Gets a querystring parameter value by name
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

// Sends a request to an ICWS resource
function sendRequest(verb, resource, requestData, successCallback, errorCallback) {
    // Build request
    var request = {
        type: verb,
        success: successCallback,
        error: errorCallback,
        headers: {},
        dataFilter:dataFilter
    };

    // Enable CORS
    request.xhrFields = { withCredentials:'true' };

    // Set URL
    request.url = inin_server + '/icws/' + resource;

    // Add standard headers
    request.headers['Accept-Language'] = 'en-us';
    request.headers['Accept-Language'] = 'en-us';

    // Add CSRF token
    if (inin_csrfToken)
        request.headers['ININ-ICWS-CSRF-Token'] = inin_csrfToken;

    // Add data
    if (requestData)
        request.data = JSON.stringify(requestData);

    // Send request
    console.debug(request.type + ' ' + request.url);
    $.ajax(request);
}

// Ensures that ICWS responses have a JSON body for jQuery to parse
function dataFilter(data, type) {
    /****** KNOWN ISSUE ******
     * The purpose of this is to provide content for a response that has none. ICWS 
     * sends a status code of 200 and a Content-Type header of JSON even when there 
     * is no content. This causes jQuery to encounter an error (Unexpected end of 
     * input) that prevents it from calling any of the success, error, or complete 
     * callbacks. Setting the content to an empty JSON document prevents this error.
     */
    if (data == undefined || data == '')
        return '{}';
    else
        return data;
}

// Return a timestamp with the format "m/d/yy h:MM:ss TT"
function timeStamp(makeShort) {
    // Create a date object with the current time
    var now = new Date();

    // Create an array with the current month, day and time
    var date = [ now.getMonth() + 1, now.getDate(), now.getFullYear() ];

    // Create an array with the current hour, minute and second
    var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];

    // Determine AM or PM suffix based on the hour
    var suffix = ( time[0] < 12 ) ? "AM" : "PM";

    // Convert hour from military time
    time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12;

    // If hour is 0, set it to 12
    time[0] = time[0] || 12;

    // If seconds and minutes are less than 10, add a zero
    for ( var i = 1; i < 3; i++ ) {
        if ( time[i] < 10 ) {
            time[i] = "0" + time[i];
        }
    }

    // Return the formatted string
    return makeShort ? time.join(":") : date.join("/") + " " + time.join(":") + " " + suffix;
}



/****** SESSION MANAGEMENT ******
 * These functions manipulate
 */

// Loads the credentials cookie and populates fields
function loadCredsCookie() {
    var credsCookie = $.cookie(inin_credsCookie);
    if (credsCookie != undefined){
        // Convert to JSON object
        var credsCookieData = eval('('+credsCookie+')');
        console.debug('Got credentials cookie');

        // Set fields
        $('#inin-server').val(credsCookieData.server);
        $('#inin-port').val(credsCookieData.port);
        $('#inin-username').val(credsCookieData.username);
    } else {
        console.debug('no creds cookie');
    }
}

// Creates a connection to ICWS
function login() {
    // Validate
    if ($('#inin-server').val().trim() == '') {
        setError('Server cannot be blank!');
        return;
    }
    if ($('#inin-port').val().trim() != '' && !isNumeric($('#inin-port').val().trim())) {
        setError('Port must be a number!');
        return;
    }
    if ($('#inin-username').val().trim() == '') {
        setError('Username cannot be blank!');
        return;
    }
    if ($('#inin-password').val() == '') {
        setError('Password cannot be blank!');
        return;
    }

    // Clear error message
    setError();

    // Set local vars 
    inin_server = $('#inin-server').val();
    if (inin_server.endsWith('/')) {
        // Remove trailing slash
        inin_server = inin_server.substring(0, inin_server.length - 1);
    }
    if ($('#inin-port').val().trim() == '') {
        // Add default ports if none specified
        if (inin_server.startsWith('https'))
            inin_server += ':8019';
        else
            inin_server += ':8018';
    } else {
        // Add specified port
        inin_server += ':' + $('#inin-port').val().trim();
    }
    inin_username = $('#inin-username').val().trim();
    inin_password = $('#inin-password').val();


    // Save credentials cookie
    var cookieData = '{ '+
        '"server":"' + $('#inin-server').val().trim() + '", ' +
        '"port":"' + $('#inin-port').val().trim() + '", ' +
        '"username":"' + $('#inin-username').val().trim() + '"' +
        ' }';
    $.cookie(inin_credsCookie, cookieData, { expires: 31 });

    // Build auth request
    loginData = {
        "__type":"urn:inin.com:connection:icAuthConnectionRequestSettings",
        "applicationName":inin_appname,
        "userID":inin_username,
        "password":inin_password                      
    };
    
    // Log in
    sendRequest("POST","connection", loginData, 
        function (data, textStatus, jqXHR) {
            console.group('Login Success');
            console.debug(data);
            console.debug(textStatus);
            console.debug(jqXHR);
            console.groupEnd();

            // Parse data object
            var jsonData = JSON.parse(data);

            // Save data
            inin_sessionId = jsonData.sessionId;
            inin_csrfToken = jsonData.csrfToken;

            // Initialize application
            initialize();
        }, 
        function (jqXHR, textStatus, errorThrown) {
            var jsonResponse = JSON.parse(jqXHR.responseText);
            console.error(data);

            setError(jsonResponse.message);
            logout();
        });                
}

// Initializes after verifying a valid session exists
function initialize() {
    // Start a polling method to get messages from the server. 
    if (inin_messagePollTimer) return;
    inin_messagePollTimer = setInterval(function() {
        sendRequest("GET", inin_sessionId + "/messaging/messages", null, onCheckMessagesSuccess);
    }, inin_messagePollInterval);

    // Watch user's queue
    var queueSubscriptionData = {
        queueIds: [
            {
                queueType: 1,
                queueName: inin_username
            }
        ],
        attributeNames: [
            'Eic_InteractionId',
            'Eic_RemoteName',
            'Eic_RemoteAddress',
            'Eic_State',
            'Eic_ObjectType'
        ]
    };
    sendRequest('PUT', inin_sessionId + '/messaging/subscriptions/queues/arbitrarystring', queueSubscriptionData, 
        function (data, textStatus, jqXHR) {
            console.group('Queue subscription success');
            console.debug(data);
            console.debug(textStatus);
            console.debug(jqXHR);
            console.groupEnd();
        }, 
        function (jqXHR, textStatus, errorThrown) {
            console.group('Queue subscription failure');
            console.debug(jqXHR);
            console.debug(textStatus);
            console.error(errorThrown);
            console.groupEnd();
        });
}

// Success handler for POST /{sessionId}/messaging/messages
function onCheckMessagesSuccess(data, textStatus, jqXHR){
    var jsonData = JSON.parse(data);

    if(!jsonData || jsonData.length == 0){
        //console.log('No messages');
        return;
    }
    
    if ($('#inin-showMessages').is(':checked')) {
        $('#inin-eventlog').append(timeStamp(true) + ' - <pre>' + JSON.stringify(jsonData, null, 4) + '</pre><br />');
    }
    console.group('Processing ' + jsonData.length + ' messages');
    for(var i=0; i<jsonData.length; i++)
    {
        processMessage(jsonData[i]);
    }
    console.groupEnd();
}

function processMessage(message) {
    console.debug(message);
    
    var handled = false;
    switch (message.__type) {
        case 'urn:inin.com:queues:queueContentsMessage':
            handleQueueMessage(message);
            handled = true;
            break;
    }

    if (!handled) {
        console.error('Failed to handle message: ' + JSON.stringify(message));
    }
}

function handleQueueMessage(message) {
    if (!message.isDelta) return;

    if (message.interactionsAdded) {
        for (var i = 0; i < message.interactionsAdded.length; i++) {
            var interaction = message.interactionsAdded[i];
            $('#inin-myinteractions').append(
                '<tr id="row-' + interaction.interactionId + '">' +
                    '<td class="interactionId"><img src="img/delete.png" style="cursor:pointer" onclick="disconnect(\'' + interaction.interactionId + '\')" />' + interaction.interactionId + '</td>' +
                    '<td class="Eic_RemoteName">' + interaction.attributes.Eic_RemoteName + '</td>' +
                    '<td class="Eic_RemoteAddress">' + interaction.attributes.Eic_RemoteAddress + '</td>' +
                    '<td class="Eic_State">' + interaction.attributes.Eic_State + '</td>' +
                '</tr>'
                );
        }
    }

    if (message.interactionsChanged) {
        for (var i = 0; i < message.interactionsChanged.length; i++) {
            var interaction = message.interactionsChanged[i];
            for (var key in interaction.attributes) {
                if (interaction.attributes.hasOwnProperty(key)) {
                    $('#row-'+interaction.interactionId+' .'+key).html(interaction.attributes[key]);
                }
            }
        }
    }

    if (message.interactionsRemoved) {
        for (var i = 0; i < message.interactionsRemoved.length; i++) {
            var interaction = message.interactionsRemoved[i];
            $('#row-'+interaction).remove();
        }
    }
}



/****** INTERACTIONS ******
 * Functions for interactions
 */

// Places a new call
function placeCall() {
    var dialstring = $('#inin-dialstring').val();
    if (dialstring == '') return;

    var dialData = {
        __type: 'urn:inin.com:interactions:createCallParameters',
        target: dialstring
    };

    console.debug('Dialing ' + dialstring);
    sendRequest('POST', inin_sessionId + '/interactions', dialData,
        function (data, textStatus, jqXHR) {
            console.group('Dial success');
            console.debug(data);
            console.debug(textStatus);
            console.debug(jqXHR);
            console.groupEnd();
        }, 
        function (jqXHR, textStatus, errorThrown) {
            console.group('Dial failure');
            console.debug(jqXHR);
            console.debug(textStatus);
            console.error(errorThrown);
            console.groupEnd();
        });
}

// Disconnects the interaction
function disconnect(interactionId) {
    console.debug('Disconnecting ' + interactionId);
    sendRequest('POST', inin_sessionId + '/interactions/' + interactionId + '/disconnect', 
        function (data, textStatus, jqXHR) {
            console.group('Disconnect request success');
            console.debug(data);
            console.debug(textStatus);
            console.debug(jqXHR);
            console.groupEnd();
        }, 
        function (jqXHR, textStatus, errorThrown) {
            console.group('Disconnect request failure');
            console.debug(jqXHR);
            console.debug(textStatus);
            console.error(errorThrown);
            console.groupEnd();
        });
}