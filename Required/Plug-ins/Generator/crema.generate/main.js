/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*jslint vars: true, node: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true*/

(function () {
    "use strict";

    var PLUGIN_ID = "crema",
        GENERATE_ASSEST_PLUGIN_ID = "generator-assets",
        HOSTNAME = "127.0.0.1";


    /********************************************/

    var packageConfig = require("./package.json"),
        resolve = require("path").resolve,
        domain = require("domain"),
        http = require("http"),
        path = require("path"),
        fs = require("fs"),
        Q = require("q"),
        connect = require("connect"),
        morgan = require("morgan"),
        crypto = require("crypto"),
        PNG = require('pngjs').PNG,
        AssetExtractor = require("./lib/asset-extractor"),
        Locale = require("locale"),
        MaxPixels = require("shared/MaxPixels"),
        PreviewRequestHandler = require("./lib/preview-request-handler"),
        PSDialogs = require("./lib/ps-dialogs"),
        PSEventStrings = require("./lib/ps-event-strings"),
        PreviewCache = require("./lib/preview-cache"),
        UserSettings = require("shared/UserSettings"),
        JSXRunner = require("./lib/JSXRunner"),
        Metadata = require("shared/Metadata"),
        QuickExport = require("./lib/quick-export"),
        Headlights = require("./lib/headlights"),
        WebSocketServer = require("ws").Server,
        Stream = require("stream"),
        Buffer = require("buffer").Buffer,
        allowConnections = false,
        _ = require("underscore");

    var mimeMap = {
            '.txt': 'text/plain',
            '.html': 'text/html',
            '.htm': 'text/html',
            '.css': 'text/css',
            '.xml': 'application/xml',
            '.json': 'application/json',
            '.js': 'application/javascript',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.png': 'image/png',
            '.svg': 'image/svg+xml',
            '.woff': 'application/font-woff'
        };


    var _generator = null,
        _logger = null,
        _connCount = 0,
        _portNumber = null,
        _serverToken = null,
        _defaultSettings = null,
        _userSettings = null;

    function reportError(conn, message, id) {
        _logger.warn(message);
        
        if (conn.readyState === conn.OPEN) {
            conn.send(JSON.stringify({id: id, error: message}));
            return true;
        }
        return false;
    }

    function handleConnectionClose(conn) {
        AssetExtractor.deleteAllPreviewsForConnection(conn._cremaId);
    }

    function returnPromiseResults(promise, conn, id, traceLabel) {
        promise.then(function (result) {
            try {
                // we can have results as an array due to allsettled.
                // so we want to pull off the first and check its state.
                if (result.length) {
                    var invalid = _.find(result, function(promise) {
                        return promise.state == "rejected";
                    });
                    if (invalid) {
                        // If the rejection reason is an error, pull out the message and send it. Otherwise, just send
                        // the reason, whatever it is.
                        var error = invalid.reason,
                            errorMessage = error.message ? error.message : error;
                        conn.send(JSON.stringify({id: id, error: errorMessage}));
                        return;
                    }
                }
                conn.send(JSON.stringify({id: id, result: result}));
            } catch (ex) {
                _logger.warn(traceLabel + " exception: " + ex);
            }
        }).catch(function(e) {
            try {
                conn.send(JSON.stringify({id: id, error: e && e.message}));
            } catch (ex) {
                _logger.warn(ex);
            }
        });
    }

    function requestAccurateBounds(documentId, layerId) {
        return _generator.getPixmap(documentId, layerId, { boundsOnly: true }).get("bounds");
    }

    function addAuxiliaryInfoToDocinfo(docinfo) {
        var _homeDirectory = process.env[(process.platform === "win32") ? "USERPROFILE" : "HOME"],
            _desktopDirectory = _homeDirectory && path.resolve(_homeDirectory, "Desktop");

        docinfo._fileDirectory = path.dirname(docinfo.file);
        if (docinfo._fileDirectory === "." || docinfo.file.indexOf("/.Trashes/") !== -1) {
            docinfo._fileDirectory = _desktopDirectory;
        }
        docinfo._fileName = path.basename(docinfo.file);
        docinfo._fileExtension = path.extname(docinfo.file);
        docinfo._fileBaseName = (docinfo._fileExtension.length) ? docinfo._fileName.substr(0, docinfo._fileName.length - docinfo._fileExtension.length) : docinfo._fileName;

        docinfo._maxSupportedPixels = MaxPixels.getMaxPixels();

        if (_defaultSettings) {
            docinfo.defaultSettings = _.extend({}, _defaultSettings);
        }
    }

    function handleMessage(message, conn) {
        try {
            var m = JSON.parse(message),
                emitter,
                genAll,
                promise;
            //_logger.log("received message: %s", message);
            _logger.log("received command: %s", m.command);
            if (!m.hasOwnProperty("token") || m.token !== _serverToken) {
                _logger.error("closing connection: " + message);
                conn.close();
                return;
            }
            if (m.hasOwnProperty("command") && m.hasOwnProperty("id")) {
                switch (m.command) {
                case "docinfo":
                    /**
                     * Instead of calling down into PS to get the docinfo, this turns the generator-assets DOM into
                     * docinfo, since generator-assets is continually keeping an up to date version of its DOM from PS
                     * change events.
                     *
                     * The docinfo returned isn't 100% consistent with PS docinfo, but it's close and a good fit for our
                     * purposes. The only known differences include:
                     *
                     * 1) Selection is represented in docinfo._selectionById instead of docinfo.selection (which is by
                     *    layer index).
                     * 2) Layers do not have an index property.
                     */
                    AssetExtractor
                        .getActiveDocument()
                        .then(function (document) {
                            var docinfo = document.toRaw();
                            addAuxiliaryInfoToDocinfo(docinfo);
                            conn.send(JSON.stringify({ id: m.id, result: docinfo }));
                        })
                        .catch(function (e) {
                            _logger.log(e);
                            conn.send(JSON.stringify({id: m.id, error: "error getting doc info"}));
                        });
                    break;
                case "setDefaultSettings":
                    _defaultSettings = m.payload.defaultSettings;
                    _userSettings.set({ "defaultSettings": _defaultSettings});
                    conn.send(JSON.stringify({id: m.id, result: "success"}));
                    break;
                case "setDocSettings":
                    genAll = _generator.getDocumentSettingsForPlugin(null, PLUGIN_ID) || {};
                    genAll.docSettings = m.payload.docSettings;

                    _generator.setDocumentSettingsForPlugin(genAll, PLUGIN_ID);
                    conn.send(JSON.stringify({id: m.id, result: "success"}));
                    break;
                case "setLayerInfo":
                    if (_generator.setLayerSettingsForPlugin) {
                        _generator.setLayerSettingsForPlugin(m.payload.generatorSettings, m.payload.layerId, PLUGIN_ID);
                    } else {

                        genAll = _generator.getDocumentSettingsForPlugin(null, PLUGIN_ID) || {};
                        if (!genAll.layers) {
                            genAll.layers = {};
                        }
                        genAll.layers[m.payload.layerId] = m.payload.generatorSettings;

                        _generator.setDocumentSettingsForPlugin(genAll, PLUGIN_ID);
                    }
                    conn.send(JSON.stringify({id: m.id, result: "success"}));
                    break;
                case "getExactLayerBounds":
                    requestAccurateBounds(m.payload.docId, m.payload.layerId)
                        .then(function (rawBounds) {
                            conn.send(JSON.stringify({id: m.id, result: rawBounds}));
                        }, function (err) {
                            conn.send(JSON.stringify({id: m.id, error: "Error from getExactLayerBounds: " + err}));
                        });
                    break;
                case "getMaxPixels":
                    try {
                        conn.send(JSON.stringify({id: m.id, result: MaxPixels.getMaxPixels()}));
                    } catch (ex) {
                        reportError(conn, "Exception while returning getMaxPixels exception: " + ex);
                    }
                    break;
                case "exportComponents":
                    if (m.payload.components) {
                        promise = AssetExtractor.exportComponents(m.payload.components);
                        returnPromiseResults(promise, conn, m.id, "exportComponents");
                    } else {
                        conn.send(JSON.stringify({id: m.id, error: "no components"}));
                    }
                    break;
                case "generatePreview":
                    if (m.payload.component) {
                        var arrayOfChunks = [],
                            totalLength = 0,
                            stream = new Stream.Writable();
                        stream._write = function (chunk, encoding, next) {
                            arrayOfChunks.push(chunk);
                            totalLength += chunk.length;
                            next();
                        };
                        stream.on("finish", function () {
                            // Emulate fs stream so streamPixmap() resolves deferred object
                            stream.emit("close");
                        });
                        m.payload.component.stream = stream;
                        AssetExtractor
                            .generatePreview(m.payload.component, conn._cremaId)
                            .then(function (componentRenderedEvent) {
                                var arrayBuffer = Buffer.concat(arrayOfChunks, totalLength);
                                arrayOfChunks = [];
                                componentRenderedEvent.fileSize = totalLength;
                                PreviewCache.setBuffer(m.payload.component.id, arrayBuffer);
                                conn.send(JSON.stringify(componentRenderedEvent));
                            });
                    } else {
                        conn.send(JSON.stringify({id: m.id, error: "no component"}));
                    }
                    break;
                case "getComponentFileSize":
                    if (m.payload.component) {
                        promise = AssetExtractor.getComponentFileSize(m.payload.component);
                        returnPromiseResults(promise, conn, m.id, "getComponentFileSize");
                    } else {
                        conn.send(JSON.stringify({id: m.id, error: "no components"}));
                    }
                    break;
                default:
                    conn.send(JSON.stringify({id: m.id, error: "unknown command '" + m.command + "'"}));
                }
            } else {
                conn.send(JSON.stringify({error: "message format error"}));
            }
        } catch (e) {
            try {
                conn.send(JSON.stringify({error: "unknown message handling error"}));
            } catch (ex2) {
                _logger.warn(ex2);
            }
            _logger.error("Couldn't handle message %s: %s", message, e);
        }
    }

    function verifyHandshake(message, conn, activeConnId) {
        _logger.log("initial message recieved");
        var valid = false,
            id;
        try {
            var m = JSON.parse(message);
            valid = (m.hasOwnProperty("command") &&
                        m.hasOwnProperty("id") &&
                        m.hasOwnProperty("token") &&
                        m.command === "handshake" &&
                        m.token === _serverToken);
            id = m.id;
        } catch (e) {
            _logger.error("Couldn't handle message %s: %s", message, e);
        }

        if (valid) {
            conn.on("message", function (message) {
                handleMessage(message, conn);
            });
            conn.send(JSON.stringify({id: id, result: "success"}));
            allowConnections = true;
        } else {
            _logger.error("closing connection: " + message);
            conn.close();
        }
    }

    function isAddressLocalhost(address) {
        return (address === "localhost" || address === "127.0.0.1");
    }

    function originIsAllowed(origin, address) {
        return (origin === "file://" && isAddressLocalhost(address));
    }

    function verifyWebSocketClient(info) {
        return originIsAllowed(info.origin, info.req.connection.remoteAddress);
    }

    function handleWebSocketConnection(conn) {
        var id = _connCount++;

        _logger.log("Accepted websocket connection with ID %d", id);

        conn._cremaId = id;

        conn.on("error", function (err) {
            _logger.error("WebSocket connection with ID %d had error, closing: %s", err);
            conn.close();
            // TODO: Do we really have to call this here or can we just rely on the call in the close handler? (Multiple calls are harmless.)
            handleConnectionClose(conn);
        });

        conn.on("close", function () {
            _generator._logHeadlights("Crema WebSocket Closed");
            _logger.log("WebSocket connection with ID %d closed", id);
            handleConnectionClose(conn);
            allowConnections = false;
        });

        conn.once("message", function (message) {
            verifyHandshake(message, conn, String(id));
        });
    }

    function getServerToken() {
        var deferred = Q.defer();
        crypto.randomBytes(256, function (ex, buf) {
            var result =  buf.toString("hex");
            deferred.resolve(result);
        });
        return deferred.promise;
    }

    function parseCookies(cookieStr) {
        var cookiePairs = cookieStr.split(";"),
            cookies = {};
        cookiePairs.forEach(function (pair) {
            var splitPair = pair.split("="),
                key = splitPair[0],
                val = splitPair[1];
            if (key) {
                cookies[key] = val;
            }
        });
        return cookies;
    }

    function hasValidCremaTokenCookie(headers) {
        if(_.has(headers, "x-crema-token")) {
            return headers["x-crema-token"] === _serverToken;
        }
        var rawCookies = headers.cookie;
        if (!rawCookies) {
            return false;
        }
        var cookies = parseCookies(rawCookies);
        return cookies.crematoken === _serverToken;
    }

    function isValidResouceRequest(request) {
        return isAddressLocalhost(request.connection.remoteAddress) &&
                hasValidCremaTokenCookie(request.headers);
    }

    function respondWithUnknownError(response, err, msg) {
        try {
            _logger.error(msg, err);

            response.writeHead(500, {"Content-Type": "text/plain"});
            response.write("unknown error\n");
            response.end();
        } catch (er2) {
            _logger.warn("Error reporting error", er2);
        }
    }

    /* @param {Generator} generator The Generator instance for this plugin.
     * @param {object} config Configuration options for this plugin.
     * @param {Logger} logger The Logger instance for this plugin.
     */
    function _realInit(generator, config, logger) {
        var genConfig = {},
            ParserManager = require("generator-assets/lib/parsermanager"),
            parserManager;

        _generator = generator;
        _logger = logger;

        if (generator._config && generator._config["generator-assets"]) {
            genConfig = _.clone(generator._config["generator-assets"]);
        }

        //always enable meta-data for crema
        genConfig["meta-data-driven"] = true;
        genConfig["meta-data-root"] = "cremaPreview";
        genConfig["expand-max-dimensions"] = true;

        // Set the default jpg encoding.  This may eventually be obviated by a better default in g-a
        genConfig["use-jpg-encoding"] = "optimal";

        if (!_.has(genConfig, "use-flite")) {
            genConfig["use-flite"] = true;
        }

        parserManager = new ParserManager(genConfig);
        
        AssetExtractor.init(generator, genConfig, logger);

        Metadata.init(new JSXRunner(generator));

        _userSettings = new UserSettings(require("shared/UserSettings/SettingsFileInterface.js"));
        _defaultSettings = _userSettings.get("defaultSettings");

        var app = connect(),
            server = http.createServer(app),
            wss = new WebSocketServer({server: server, verifyClient: verifyWebSocketClient});

        wss.on("connection", handleWebSocketConnection);

        function tryToListen(server, port) {
            var deferred = Q.defer();

            server.on("error", function (e) {
                if (e.code === "EADDRINUSE") {
                    _logger.log("Address in use...");
                }
                deferred.reject(e);
            });
            server.listen(port, HOSTNAME, 511, function () {
                deferred.resolve(server.address().port);
            });

            return deferred.promise;
        }

        Q.all([tryToListen(server, 0), getServerToken()]).spread(function (port, token) {
            _portNumber = port;
            _serverToken = token;
            _generator.updateCustomOption(PLUGIN_ID, "cremaPluginConection", {port: _portNumber, token: _serverToken});
        }, function (e) {
            _logger.log("Listen rejected - code is " + e.code);
        });

        var getQuickExportOptions = function () {
            return {
                headlights: new Headlights(_generator),
                psDialogs: new PSDialogs(_generator),
                requestAccurateBoundsFunction: requestAccurateBounds,
                exportComponentsFunction: AssetExtractor.exportComponents.bind(AssetExtractor),
                metadataProvider: Metadata
            };
        };

        var runQuickExport = function (psEvent, document) {
            var quickExport = new QuickExport(getQuickExportOptions());
            return quickExport.run(psEvent, document.toRaw());
        };

        var handleQuickExport = function (psEvent) {
            AssetExtractor
                .getActiveDocument()
                .then(_.partial(runQuickExport, psEvent))
                .then(function (results) {
                    _logger.log("Quick exported:", results);
                })
                .catch(function (e) {
                    e = e || {};
                    _logger.error("Error running quick export:", e, e.stack);
                });
        };

        _generator.onPhotoshopEvent(PSEventStrings.QUICK_EXPORT_DOCUMENT, handleQuickExport);
        _generator.onPhotoshopEvent(PSEventStrings.QUICK_EXPORT_SELECTION, handleQuickExport);

        app.use(morgan("dev"))
            .use(function (request, response, next) {
                try {
                    if (!isValidResouceRequest(request)) {
                        response.writeHead(403, {"Content-Type": "text/plain"});
                        response.end();
                        return;
                    }

                    var uri = request.url,
                        sURI = uri.toLowerCase(),
                        extname,
                        contentType,
                        layerId = -1;

                    if (sURI.indexOf("?") > 0) {
                        sURI = sURI.substring(0, sURI.indexOf("?"));
                    }

                    extname = path.extname(sURI);
                    contentType = mimeMap[extname] || 'text/html';

                    if (sURI.indexOf("handshake") >= 0) {
                        response.writeHead(200, {"Content-Type": "text/plain", "Set-Cookie": "crematoken=" + _serverToken});
                        response.write("success\n");
                        response.end();
                    } else if (sURI.indexOf("preview/") >= 0) {
                        var getPreviewFunction = AssetExtractor.getPreview.bind(AssetExtractor);
                        PreviewRequestHandler.handlePreviewRequest(sURI, response, contentType, getPreviewFunction);
                    } else {
                        if (!allowConnections) {
                            response.writeHead(500, {"Content-Type": "text/plain"});
                            response.write("Websocket gone away, no longer accepting connection\n");
                            response.end();
                            return;
                        }
                        generator.getDocumentInfo().then(function (document) {

                            try {
                                var layerSpec = {},
                                    settings = {},
                                    scale = 1.0;

                                if (document.bounds) {
                                    var w = document.bounds.right - document.bounds.left,
                                        h = document.bounds.bottom - document.bounds.top,
                                        maxDim = 800.0;

                                    if (w > maxDim && w > h) {
                                        scale = w / maxDim;
                                    } else if (h > maxDim) {
                                        scale = h / maxDim;
                                    }

                                    if (scale <= 1.0 && scale > 0.0) {
                                        settings.scaleX = scale;
                                        settings.scaleY = scale;
                                    }
                                }

                                if (sURI.toLowerCase().indexOf("layerthumb/") >= 0) {
                                    layerId = parseInt(sURI.toLowerCase().substring(sURI.lastIndexOf("layerthumb/") + 11), 10);
                                }

                                if (layerId >= 0) {
                                    //yes, it stops being an object here and starts being a number
                                    layerSpec = layerId;

                                    //layerId is only used if params.layerSpec is not found as an Object
                                    _generator.getPixmap(document.id, layerSpec, settings).then(function (pixmap) {
                                        try {
                                            var pixels = pixmap.pixels,
                                                len = pixels.length,
                                                channels = pixmap.channelCount,
                                                i,
                                                alpha,
                                                oPNG;

                                            // convert from ARGB to RGBA
                                            for (i = 0; i < len; i += channels) {
                                                alpha = pixels[i];
                                                pixels[i]     = pixels[i + 1];
                                                pixels[i + 1] = pixels[i + 2];
                                                pixels[i + 2] = pixels[i + 3];
                                                pixels[i + 3] = alpha;
                                            }

                                            // init a new PNG
                                            oPNG = new PNG({
                                                width: pixmap.width,
                                                height: pixmap.height
                                            });

                                            // set pixel data
                                            oPNG.data = pixmap.pixels;
                                            response.writeHead(200, {"Content-Type": contentType });
                                            oPNG.pack().pipe(response);
                                        } catch (erHandlePxmap) {
                                            respondWithUnknownError(response, erHandlePxmap, "getPixmap exception");
                                        }
                                    }).fail(function (erPxFail) {
                                        respondWithUnknownError(response, erPxFail, "failed getPixmap");
                                    });
                                }
                            } catch (erGDI) {
                                respondWithUnknownError(response, erGDI, "getdocinfo exception");
                            }
                        }).fail(function (erFail) {
                            respondWithUnknownError(response, erFail, "failed getdocinfo");
                        });
                    }
                } catch (err) {
                    respondWithUnknownError(response, err, "http uncaught error");
                }

            });
    }

    function init(generator, config, logger) {
        Q.onerror = function (err) {
            try {
                logger.error("Q uncaught errror", err);
            } catch (e) {
                logger.warn("can't even report uncaught error from Q");
            }
        };
        var mainDomain = domain.create();
        mainDomain.on("error", function (err) {
          // The error won't crash the process, but what it does is worse!
          // Though we've prevented abrupt process restarting, we are leaking
          // resources like crazy if this ever happens.
          // This is no better than process.on('uncaughtException')!
            logger.error("mainDomain uncaught errror", err);
        });
        mainDomain.run(function () {
            generator.getPhotoshopLocale()
                .then(function (locale) {
                    Locale.init(locale);
                    _realInit(generator, config, logger);
                });
        });
    }

    exports.init = init;

}());
