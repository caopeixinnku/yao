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
"use strict";

var convertors = {
    cmin: function(dimensions, originalDimensions) {
        return  {
            width: dimensions.width * 0.3937,
            height: dimensions.height * 0.3937
        };
    },
    incm: function(dimensions, originalDimensions) {
        return  {
            width: dimensions.width * 2.54,
            height: dimensions.height * 2.54
        };
    },
    cmmm: function(dimensions, originalDimensions) {
        return {
            width: dimensions.width * 10,
            height: dimensions.height * 10
        };
    },
    mmin: function(dimensions, originalDimensions) {
        return {
            width: dimensions.width * 0.0393700787,
            height: dimensions.height * 0.0393700787
        };
    },
    inmm: function(dimensions, originalDimensions) {
        return {
            width: dimensions.width * 25.4,
            height: dimensions.height * 25.4
        };
    },
    mmcm: function(dimensions, originalDimensions) {
        return {
            width: dimensions.width / 10,
            height: dimensions.height / 10
        };
    },
    ptcm: function(dimensions, originalDimensions) {
        return convertors.pxcm(convertors.ptpx(dimensions, originalDimensions), originalDimensions);
    },
    pxpt: function(dimensions, originalDimensions) {
        return {
            width: dimensions.width * (72/originalDimensions.dpi),
            height: dimensions.height * (72/originalDimensions.dpi)
        };
    },
    "%pt": function(dimensions, originalDimensions) {
        return convertors.pxpt(convertors["%px"](dimensions, originalDimensions), originalDimensions);
    },
    cmpt: function(dimensions, originalDimensions) {
        return convertors.pxpt(convertors.cmpx(dimensions, originalDimensions), originalDimensions);
    },
    inpt: function(dimensions, originalDimensions) {
        return convertors.pxpt(convertors.inpx(dimensions, originalDimensions), originalDimensions);
    },
    mmpt: function(dimensions, originalDimensions) {
        return convertors.pxpt(convertors.mmpx(dimensions, originalDimensions), originalDimensions);
    },
    ptin: function(dimensions, originalDimensions) {
        return convertors.pxin(convertors.ptpx(dimensions, originalDimensions), originalDimensions);
    },
    ptmm: function(dimensions, originalDimensions) {
        return convertors.pxmm(convertors.ptpx(dimensions, originalDimensions), originalDimensions);
    },
    "pt%": function(dimensions, originalDimensions) {
        return convertors["px%"](convertors.ptpx(dimensions, originalDimensions), originalDimensions);
    },
    ptpx: function(dimensions, originalDimensions) {
        return {
            width: (dimensions.width / 72) * originalDimensions.dpi,
            height: (dimensions.height / 72) * originalDimensions.dpi,
        };
    },
    mmpx: function(dimensions, originalDimensions) {
        return convertors.inpx(convertors.mmin(dimensions, originalDimensions), originalDimensions);
    },
    pxmm: function(dimensions, originalDimensions) {
        return convertors.inmm(convertors.pxin(dimensions, originalDimensions), originalDimensions);
    },
    cmpx: function(dimensions, originalDimensions) {
        return convertors.inpx(convertors.cmin(dimensions, originalDimensions), originalDimensions);
    },
    pxcm: function(dimensions, originalDimensions) {
        return convertors.incm(convertors.pxin(dimensions, originalDimensions), originalDimensions);
    },
    "%px": function(dimensions, originalDimensions) {
        return {
            width: originalDimensions.width * dimensions.width / 100,
            height: originalDimensions.height * dimensions.height / 100
        };
    },
    "%in": function(dimensions, originalDimensions) {
        return convertors.pxin(convertors["%px"](dimensions, originalDimensions), originalDimensions);
    },
    "%cm": function(dimensions, originalDimensions) {
        return convertors.pxcm(convertors["%px"](dimensions, originalDimensions), originalDimensions);
    },
    "%mm": function(dimensions, originalDimensions) {
        return convertors.pxmm(convertors["%px"](dimensions, originalDimensions), originalDimensions);
    },
    "cm%": function(dimensions, originalDimensions) {
        return convertors["px%"](convertors.cmpx(dimensions, originalDimensions), originalDimensions);
    },
    "mm%": function(dimensions, originalDimensions) {
        return convertors["px%"](convertors.mmpx(dimensions, originalDimensions), originalDimensions);
    },
    inpx: function(dimensions, originalDimensions) {
        return {
            width: dimensions.width * originalDimensions.dpi,
            height: dimensions.height * originalDimensions.dpi,
        };
    },
    "in%": function(dimensions, originalDimensions) {
        return convertors["px%"](convertors.inpx(dimensions, originalDimensions), originalDimensions);
    },
    pxin: function(dimensions, originalDimensions) {
        return {
            width: dimensions.width / originalDimensions.dpi,
            height: dimensions.height / originalDimensions.dpi,
        };
    },
    "px%": function(dimensions, originalDimensions) {
        return {
            width: (dimensions.width / originalDimensions.width) * 100,
            height: ((dimensions.height / originalDimensions.height) * 100)
        };
    }
};


module.exports = function(currentDimensions, originalDimensions, unitFrom, unitTo) {
    return convertors[unitFrom + unitTo](currentDimensions, originalDimensions);
};