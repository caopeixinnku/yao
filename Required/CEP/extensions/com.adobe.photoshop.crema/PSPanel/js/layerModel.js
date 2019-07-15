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
/*global define: true, require: true */
"use strict";

var Backbone = require('backbone'),
    GenableModel = require('./genableModel.js');

var LayerModel = GenableModel.extend({
    
    
    //static method to determine whether the rawLayer is extractable
    LayerDataIsExtractable: function (rawLayer) {
        
        //TBD: filter irrelevant layer-types here.
        
        return true;
    }
    
});

module.exports = LayerModel;
