/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright (c) 2015 Adobe Systems Incorporated. All rights reserved.
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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, unused: true, node: true */
var CremaGlobal = require("../cremaGlobal.js");

var g_isWin,
    isWin = function() {
        if (g_isWin === undefined) {
            g_isWin = CremaGlobal.csInterface.getOSInformation().indexOf("Windows") > -1;
        }
        return g_isWin;
    };

/**
 * isShiftOnlyEvent
 * Returns true if shift is down and not ctrl, meta or alt. This select
 * what is in the range and deselect what is not in the range
 */
var isShiftOnlyEvent = function (event) {
    return (event && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey);
};

/**
 * isAltOnlyEvent
 * Returns true if alt is down and not shift, ctrl, or meta.
 */
var isAltOnlyEvent = function (event) {
    return (event && event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey);
};

/**
 * isMacMetaOrWinCtrlAndShiftOnlyEvent
 * Returns true if shift and ctrl/meta is down but not alt. This is select
 * what is in the range and without deselecting anything that's not
 */
var isMacMetaOrWinCtrlAndShiftOnlyEvent = function (event) {
    if (!event) {
        return false;
    }

    if (isWin()) {
        return (event.ctrlKey && event.shiftKey && !event.metaKey && !event.altKey);
    }
    return (event.metaKey && event.shiftKey && !event.ctrlKey && !event.altKey);
};
    
/**
 * isMacMetaOrWinCtrlOnlyEvent
 * If you have a view with multiple items you can add or remove individual items holding 
 * down this key combo. This is similar to canvas based selections that use the shift key, 
 * but shift key in a list usually selects the entire range.
 */
var isMacMetaOrWinCtrlOnlyEvent = function (event) {
    if (!event) {
        return false;
    }

    if (isWin()) {
        return (event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey);
    }
    return (event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey);
};
  
module.exports.isShiftOnlyEvent = isShiftOnlyEvent;
module.exports.isAltOnlyEvent = isAltOnlyEvent;
module.exports.isMacMetaOrWinCtrlAndShiftOnlyEvent = isMacMetaOrWinCtrlAndShiftOnlyEvent;
module.exports.isMacMetaOrWinCtrlOnlyEvent = isMacMetaOrWinCtrlOnlyEvent;
module.exports.isRangeExclusiveSelectionEvent = isShiftOnlyEvent;
module.exports.isRangeAdditiveSelectionEvent = isMacMetaOrWinCtrlAndShiftOnlyEvent;
module.exports.isToggleItemSelectionInListViewEvent = isMacMetaOrWinCtrlOnlyEvent;
