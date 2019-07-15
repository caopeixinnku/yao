/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */

/*jslint vars: true, node: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true */
/*global WebSocket, window */

var Backbone = require("backbone"),
    _ = require("underscore"),
    JSXRunner = require("./JSXRunner"),
    Headlights  = require("./utils/Headlights"),
    CremaGlobal = require("./cremaGlobal.js"),
    Q = require("q"),
    ServerInterface;

(function () {
    "use strict";
    
    var CONNECTION_RETRY_DELAY = 1000,
        WS_HOST = "ws://127.0.0.1",
        RESOURCE_HOST = "http://127.0.0.1";

    var _commandId = 0,
        _deferreds = [],
        _port,
        _token,
        connectionAttempt = 10;
    
    
    var displayStatus = function (message) {
        if (CremaGlobal.window) {
            CremaGlobal.window.console.log(message);
        }
    };
    
    var escapePluginId = function (pluginId) {
        if (!pluginId) {
            return pluginId;
        }
        return pluginId.replace(/[^a-zA-Z0-9]/g, function (char) {
            return "_" + char.charCodeAt(0) + "_";
        });
    };
    
    var receiveMessage = function (message) {
        var result = JSON.parse(message.data);
        if (result.hasOwnProperty("id") && _deferreds[result.id]) {
            if (result.hasOwnProperty("result")) {
                _deferreds[result.id].resolve(result.result);
            } else if (result.hasOwnProperty("error")) {
                _deferreds[result.id].reject(result.error);
            } else {
                _deferreds[result.id].reject("no result body");
            }
        } else if (result.eventType === "imageChanged") {
            ServerInterface.trigger("model-update", result.doc);
        } else if (result.eventType === "componentRendered") {
            ServerInterface.trigger("asset-rendering-updated", result.timestamp, result.documentId, result.layerId, result.componentId, result.fileSize, result.scale, result.errors, result.invisible, result.hasZeroBounds, result.outsideDocumentBounds);
        } else {
            ServerInterface.displayStatus("Error: don't know what to do with message: " + JSON.stringify(message));
        }
    };

    var getCustomOptions = function (pluginId) {
        var key = escapePluginId(pluginId),
            deferred = Q.defer();

        // We stored stringified settings, but the Photoshop connection tries to
        // parse JSON responses from ExtendScript automatically.
        JSXRunner.runJSX("getCustomOptions", key, function (settings) {
            if (_.isObject(settings)) {
                deferred.resolve(settings);
            } else if (settings === "") {
                deferred.reject(new Error("settings is empty string"));
            } else if (settings === CremaGlobal.EvalScript_ErrMessage) {
                deferred.reject(new Error(CremaGlobal.EvalScript_ErrMessage));
            } else if (_.isString(settings)) {
                try {
                    var json = JSON.parse(settings);
                    if (json) {
                        deferred.resolve(json);
                    } else {
                        deferred.reject(new Error("settings parsed to nothing: " + settings));
                    }
                } catch (e) {
                    deferred.reject(e);
                }
            } else {
                ServerInterface.displayStatus("Unexpected custom options:", settings);
                deferred.reject(new Error("Unexpected custom options:" + settings));
            }
        });

        return deferred.promise;
    };

    var getCremaPort = function () {
        var deferred = Q.defer();
        getCustomOptions("crema")
            .then(function (settings) {
                settings.cremaPluginConection = settings.cremaPluginConection || {};
                var port = settings.cremaPluginConection.port,
                    token = settings.cremaPluginConection.token;
                if (port && token) {
                    deferred.resolve({port: port, token: token});
                } else {
                    deferred.reject(new Error("no port"));
                }
            }, function (e) {
                deferred.reject(e);
            });
        return deferred.promise;
    };
    
    var handshakeForResources = function (port, token) {
        var handshakeUrl = RESOURCE_HOST +  ":" + port + "/handshake",
            settings = { headers: { "x-crema-token": token } },
            promiseConverter = Q;

        return promiseConverter(Backbone.$.ajax(handshakeUrl, settings));
    };
    
    var sendInitialHandshakes = function(port, token) {
        return Q.all([handshakeForResources(port, token),
                        ServerInterface.sendCommand("handshake")]);
    };

    var createWebSocketConnection = function () {
        var deferred = Q.defer();

        ServerInterface.displayStatus("connecting...");
        ServerInterface.getCremaPort().then(function (settings) {
            var wsURL = WS_HOST + ":" + settings.port;
            ServerInterface.displayStatus("Crema port = " + settings.port);
            _port = settings.port;
            _token = settings.token;
            
            // create the websocket and immediately bind handlers
            
            ServerInterface._ws = new CremaGlobal.window.WebSocket(wsURL);

            ServerInterface._ws.onopen = function () {
                ServerInterface.sendInitialHandshakes(settings.port, settings.token)
                .then(function () {
                    ServerInterface.displayStatus("connected");
                    ServerInterface.trigger("generator-connected");
                    deferred.resolve();
                }).then(function () {
                    Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.WEBSOCK_CONNECTED);
                });
            };
            ServerInterface._ws.onmessage = receiveMessage;
            ServerInterface._ws.onclose = function () {
                ServerInterface.displayStatus("closed");
                Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.WEBSOCK_CLOSED);
                ServerInterface.trigger("generator-closed");
                _.delay(function () {
                    createWebSocketConnection().then(deferred.resolve).catch(deferred.reject);
                }, CONNECTION_RETRY_DELAY);
            };
        }, function (e) {
            ServerInterface.displayStatus("retrying count: " + connectionAttempt);
            _.delay(function () {
                createWebSocketConnection().then(deferred.resolve).catch(deferred.reject);
            }, CONNECTION_RETRY_DELAY / connectionAttempt);
            connectionAttempt--;
            if (connectionAttempt < 1) {
                Headlights.logEvent(Headlights.CREMA_ACTION, Headlights.WEBSOCK_RETRY);
                connectionAttempt = 1;
            }
        });

        return deferred.promise;
    };

    var getCachedCremaPort = function () {
        return _port;
    };

    var sendCommand = function (command, payload) {
        if (!ServerInterface._ws || ServerInterface._ws.readyState !== CremaGlobal.window.WebSocket.OPEN) {
            ServerInterface.displayStatus("Not connected");
            return Q.reject(new Error("Not connected"));
        }
        var id = _commandId++,
            deferred = Q.defer();
        
        _deferreds[id] = deferred;
        
        deferred.promise.fin(function () {
            delete _deferreds[id];
        });

        deferred.promise.fail(function (err) {
            ServerInterface.displayStatus("Command Error: " + err);
            // TODO: It seems like this might be trying to reject a promise that is already rejected?
            // for instance, by receiveMessage?
            _deferreds[id].reject(err);
        });
        
        ServerInterface._ws.send(JSON.stringify({id: id, command: command, payload: payload, token: _token}));
        
        return deferred.promise;
    };
        
    ServerInterface = _.extend({
        escapePluginId: escapePluginId,
        createWebSocketConnection: createWebSocketConnection,
        sendCommand: sendCommand,
        handshakeForResources: handshakeForResources,
        getCachedCremaPort: getCachedCremaPort,
        receiveMessage: receiveMessage,
        SERVER_HOST: RESOURCE_HOST,
        displayStatus: displayStatus,
        getCremaPort: getCremaPort,
        sendInitialHandshakes: sendInitialHandshakes
    }, Backbone.Events);
    
    module.exports = ServerInterface;
}());
