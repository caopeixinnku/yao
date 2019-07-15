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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true, node: true */

var CremaGlobal = require("../cremaGlobal.js");

(function () {
    
    "use strict";
    
    var setPref = function(name, val) {
        if (CremaGlobal.window.localStorage) {
            CremaGlobal.window.localStorage.setItem(name, val);
        }
    };
    
    var getPref = function (name) {
        if (CremaGlobal.window.localStorage) {
            return CremaGlobal.window.localStorage.getItem(name);
        }
        return null;
    };
    
    module.exports = {
        getPref: getPref,
        setPref: setPref
    };
    
}());


