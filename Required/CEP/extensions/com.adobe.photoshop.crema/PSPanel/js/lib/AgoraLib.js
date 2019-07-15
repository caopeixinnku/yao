/**************************************************************************************************
*
* ADOBE SYSTEMS INCORPORATED
* Copyright 2014 Adobe Systems Incorporated
* All Rights Reserved.
*
* NOTICE:  Adobe permits you to use, modify, and distribute this file in accordance with the
* terms of the Adobe license agreement accompanying it.  If you have received this file from a
* source other than Adobe, then your use, modification, or distribution of it requires the prior
* written permission of Adobe.
*
**************************************************************************************************/

/** AgoraLib - v1.0.0 */

/**
 * @class AgoraLib
 *
 * AgoraLib provides an interface to the Adobe Exchange service and Exchange plugin.
 * Please note that Vulcan.js is required.
 */
function AgoraLib() {
    var extensionID = window.__adobe_cep__.getExtensionId();
    // GUID discussions: http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);return v.toString(16);});
    this.callerID = guid + '_' + extensionID;
    this.bundleID = window.__adobe_cep__.invokeSync("getBundleId", "");

    var that = this;

//--------------------------------------- Private functions ------------------------------    
    this.responseCallback = function(message) {
        if (window.DOMParser) {
            var parser = new window.DOMParser();
            try {
                var xmlDoc = parser.parseFromString(message.data, "text/xml");
                var payloadNode = xmlDoc.getElementsByTagName("payload")[0];
                if(payloadNode && payloadNode.childNodes[0]) {
                    payloadNode = payloadNode.childNodes[0].nodeValue;
                }
                if(payloadNode != null) {
                    payloadNode = cep.encoding.convertion.b64_to_utf8(payloadNode);
                }
                console.log("Decrypted payload: " + payloadNode);

                var payloadDoc = parser.parseFromString(payloadNode, "text/xml");
                var responses = payloadDoc.getElementsByTagName("Response");
                for(var i = 0; i < responses.length; i++) {
                    var respElem = responses[i];
                    if (respElem) {
                        var apiName = respElem.attributes.getNamedItem("name").nodeValue;
                        var callerID = respElem.attributes.getNamedItem("callerID").nodeValue;
                        console.log("This caller ID " + that.callerID + " received caller ID " + callerID);
                        console.log("API: " + apiName);

                        if (callerID === that.callerID) {
                            // extract parameters
                            var respParams = respElem.getElementsByTagName("Result");
                            var params = {};
                            for(var j = 0; j < respParams.length; j++) {
                                var paramName = respParams[j].attributes.getNamedItem("name").nodeValue;
                                var paramValue = respParams[j].getElementsByTagName("Value")[0].childNodes[0].nodeValue;
                                console.log("param name: " + paramName + " param value: " + paramValue);
                                params[paramName] = paramValue;
                            }

                            if (apiName === AgoraLib.IS_ENTITLED) {
                                var response = new AgoraLibResponse(params[AgoraLib.IS_ENTITLED], params[AgoraLib.STATUS], params[AgoraLib.STATUSCODE]);
                                that.isEntitledCallback(response);
                            } else if (apiName === AgoraLib.GET_PURCHASE_URL) {
                                var url = params["URL"];
                                var response = new AgoraLibResponse(url, params[AgoraLib.STATUS], params[AgoraLib.STATUSCODE]);
                                that.getPurchaseUrlCallback(response);
                            } else if (apiName === AgoraLib.GET_VERSION) {
                                var response = new AgoraLibResponse(params["Version"], params[AgoraLib.STATUS], params[AgoraLib.STATUSCODE]);
                                that.getVersionCallback(response);
                            }
                        }
                    }
                }

            }
            catch(e) {
                console.log("AgoraLibError: " + e);
            }
        }
    };

    this.checkConnection = function(callback) {

        var status = AgoraLib.status.internalClientError.status;
        var statusCode =  AgoraLib.status.internalClientError.code;

        // CoreSync and Thor will include vulcan specifiers so we can 
        // use the vulcan control library to detect CoreSync and Thor and launch when not running.
        var isInstalled = VulcanInterface.isAppInstalled("coresync");
        
        // TODO: remove when above feature is implemented in CoreSync
        var acccPath = "/Applications/Utilities/Adobe Creative Cloud/ACC/Creative Cloud.app/Contents/MacOS/Creative Cloud";
        if ((navigator.platform == "Win32") || (navigator.platform == "Windows")) {
            acccPath = navigator.userAgent.indexOf("WOW64") > -1 ? "C:\\Program Files (x86)\\Adobe\\Adobe Creative Cloud\\ACC\\Creative Cloud.exe" : "C:\\Program Files\\Adobe\\Adobe Creative Cloud\\ACC\\Creative Cloud.exe";
        }
        
        if (!isInstalled) {
            var result = window.cep.fs.stat(acccPath);
            if (0 == result.err) {
                if (result.data.isFile()) {
                    isInstalled = true;
                }
            }
        }
        // end of removal
        
        if (!isInstalled) {
            console.log("location does not exist");
            status = AgoraLib.status.creativeCloudNotFound.status;
            statusCode = AgoraLib.status.creativeCloudNotFound.code;
        } else {
            var isRunning = VulcanInterface.isAppRunning("coresync");

            if (!isRunning) {
                // attempt to launch ACC desktop which will launch CoreSync
                isRunning = VulcanInterface.launchApp("creativecloud", false, "");
                
                // TODO: remove when vulcan specifier is integrated into Thor
                if (!isRunning) {
                    var createProcessResult = window.cep.process.createProcess(acccPath, "&"); //&
                    if (0 == createProcessResult.err) {
                        var gPID = createProcessResult.data;
                        console.log("createProcess succeed, " + gPID);
                        var isRunningResult = window.cep.process.isRunning(gPID);
                        if (0 == isRunningResult.err && true == isRunningResult.data) {
                            isRunning = true;
                        }
                    }
                }
                // end of removal
            }
            
            if (!isRunning) {
                status = AgoraLib.status.creativeCloudFailedToLaunch.status;
                statusCode = AgoraLib.status.creativeCloudFailedToLaunch.code;
            } else {
                that.getVersionCallback = callback;
                var request = "<Request name=\"" + AgoraLib.GET_VERSION + "\" callerID=\"" + that.callerID + "\"><Parameters>";
                request += "</Parameters></Request>";
                var sub_payload = String.format(AgoraLib.MESSAGE_REQUEST_TEMPLATE, request);

                var GetVersionVulcanMessage = new VulcanMessage(AgoraLib.MESSAGE_TYPE);
                GetVersionVulcanMessage.setPayload(sub_payload);
            
                VulcanInterface.addMessageListener(AgoraLib.RESPONSE_TYPE, that.responseCallback);
                VulcanInterface.dispatchMessage(GetVersionVulcanMessage);
                return;
            }
        }
        var responseObject = new AgoraLibResponse("", status, statusCode);
        callback(responseObject);
    };

    // source: http://stackoverflow.com/questions/7717109/how-can-i-compare-arbitrary-version-numbers
    this.compareVersion = function (a, b) {
        var i, cmp, len, re = /(\.0)+[^\.]*$/;
        a = (a + '').replace(re, '').split('.');
        b = (b + '').replace(re, '').split('.');
        len = Math.min(a.length, b.length);
        for( i = 0; i < len; i++ ) {
            cmp = parseInt(a[i], 10) - parseInt(b[i], 10);
            if ( cmp !== 0 ) {
                return cmp;
            }
        }
        return a.length - b.length;
    }
};


//--------------------------------------- Public API ------------------------------

AgoraLib.prototype = (function(){

   /**
    * Triggers a check to determine if the current user is entitled to access the active extension. 
    * Possible responses are True, False or Unknown. Further information about the response can be found in
    * the responses status and statusCode properties. For example, if the response is true, status and statusCode can 
    * return the following combinations:\n
    * <ul>\n
    *     <li>1: Perpetual purchase</li>\n
    *     <li>2: Trial purchase</li>\n
    *     <li>3: Subscription purchase</li>\n
    *     <li>4: Subscription expired {date}</li>\n
    * </ul>\n
    * 
    * This API has a dependency on VulcanInterface.js and will throw an error if it is not undefined.
    * 
    * @param callback  The JavaScript handler function to return the AgoraLibResponse object.
    * @since 1.0.0
    */
    var isEntitled = function(callback) {

        if (typeof(Vulcan) === 'undefined') {
            throw 'Vulcan.js is required.';
        }

        if (callback == null || callback == undefined) {
            callback = function(result){};
        }

        this.isEntitledCallback = callback;
        var that = this;
        // check connection
        this.checkConnection(function(responseObj) {
            console.log(responseObj);
            // check status and statusCode for success.
            if (responseObj.statusCode === "0" && that.compareVersion(responseObj.response, "1.0.0") >= 0) {
                var request = "<Request name=\"" + AgoraLib.IS_ENTITLED + "\" callerID=\"" + that.callerID + "\"><Parameters>";
                request += "<Parameter name=\"BundleID\"><Value>" + that.bundleID + "</Value></Parameter>";
                request += "</Parameters></Request>";
                var sub_payload = String.format(AgoraLib.MESSAGE_REQUEST_TEMPLATE, request);

                var isEntitledVulcanMessage = new VulcanMessage(AgoraLib.MESSAGE_TYPE);
                isEntitledVulcanMessage.setPayload(sub_payload);
            
                VulcanInterface.addMessageListener(AgoraLib.RESPONSE_TYPE, that.responseCallback);
                VulcanInterface.dispatchMessage(isEntitledVulcanMessage);
            } else {
                var response = new AgoraLibResponse("Unknown", responseObj.status, responseObj.statusCode);
                callback(response);
            }
        });
    };

    /**
     * Calls the Adobe Exchange service for a Purchase Url for the active extension. If the request is successful the statusCode in the response will be 0.
     *
     * @param callback  The JavaScript handler function to return the AgoraLibResponse object. The Response property will either be the final checkout page or the product details page (see below).
     * @param straightToCheckout If set to true the URL returned will be the final checkout page for this Extension on the Adobe Add-ons site. If set to false the
     *                           URL returned will be the Product details page for this Extension on the Adobe Add-ons site. Default is false.
     * @since 1.0.0
     */
    var getPurchaseUrl = function(callback, straightToCheckout) {
        if (typeof(Vulcan) === 'undefined') {
            throw 'Vulcan.js is required.';
        }

        if (callback == null || callback == undefined) {
            callback = function(result){};
        }

        this.getPurchaseUrlCallback = callback;
        var straightToCheckout = (!requiredParamsValid(straightToCheckout) || straightToCheckout === '') ? false : straightToCheckout;
        
        var that = this;
        // check connection
        this.checkConnection(function(responseObj) {
            if (responseObj.statusCode === "0" && that.compareVersion(responseObj.response, "1.0.0") >= 0) {
                var request = "<Request name=\"" + AgoraLib.GET_PURCHASE_URL + "\" callerID=\"" + that.callerID + "\"><Parameters>";
                request += "<Parameter name=\"BundleID\"><Value>" + that.bundleID + "</Value></Parameter>";
                request += "<Parameter name=\"StraightToCheckout\"><Value>" + straightToCheckout + "</Value></Parameter>";
                request += "</Parameters></Request>";
                var sub_payload = String.format(AgoraLib.MESSAGE_REQUEST_TEMPLATE, request); 
    
                var getPurchaseUrlVulcanMessage = new VulcanMessage(AgoraLib.MESSAGE_TYPE);
                getPurchaseUrlVulcanMessage.setPayload(sub_payload);

                VulcanInterface.addMessageListener(AgoraLib.RESPONSE_TYPE, that.responseCallback);
                VulcanInterface.dispatchMessage(getPurchaseUrlVulcanMessage);
            } else {
                var response = new AgoraLibResponse("", responseObj.status, responseObj.statusCode);
                callback(response);
            }
        });
    };

    return {
        constructor: AgoraLib,
        isEntitled: isEntitled,
        getPurchaseUrl: getPurchaseUrl,
    };
})();

/**
 * Provides consts for some of the status responses returned by the AgoraLib client.
 */
AgoraLib.status = {
    internalClientError : {
            status        : "Internal client error",
            code          : 1005
    },
    creativeCloudNotFound : {
            status        : "Adobe Creative Cloud Desktop is not installed",
            code          : 1008
    },
    creativeCloudFailedToLaunch : {
            status        : "Adobe Creative Cloud Desktop failed to launch",
            code          : 1007
    }   
};

/**
 * Returned as the response by all AgoraLib APIs.
 * @param string response   The main result of the API request
 * @param string status     Textual description that either provides information of an error or additional information about the response.
 * @param int statusCode    status code.
 */
function AgoraLibResponse(response, status, statusCode) {
    this.response = response;
    this.status = status;
    this.statusCode = statusCode;
}

//--------------------------------------- AgoraLib Consts ------------------------------
//
AgoraLib.IS_ENTITLED                = "IsEntitled";
AgoraLib.GET_PURCHASE_URL           = "GetPurchaseUrl";
AgoraLib.GET_VERSION                = "GetVersion";
AgoraLib.STATUS                     = "Status";
AgoraLib.STATUSCODE                 = "StatusCode";
AgoraLib.MESSAGE_TYPE               = "vulcan.SuiteMessage.cosy.exchangeplugin.ApiRequest";
AgoraLib.RESPONSE_TYPE              = "vulcan.SuiteMessage.cosy.exchangeplugin.ApiResponse";
AgoraLib.MESSAGE_REQUEST_TEMPLATE   = "<Message><Requests>{0}</Requests></Message>";
AgoraLib.MESSAGE_RESPONSE_TEMPLATE  = "<Message><Responses>{0}</Responses></Message>";