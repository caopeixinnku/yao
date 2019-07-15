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

//if you are using inputs purely for this value, please pull it into its own module
var INDETERMINATE_VALUE = {indeterminate: true},
    INDETERMINATE_DISPLAY = "--";

/**
 * Sets a checkbox to either checked, unchecked, or indeterminate. 
 * @param {$(input)} $checkbox
 * @param {true|false|Intputs.INDETERMINATE_VALUE} val
 */
var setTristateCheckboxValue = function ($checkbox, val) {
    switch (val) {
        case true:  // checked
            $checkbox.prop("checked", true);
            $checkbox.prop("indeterminate", false);
            break;
        case module.exports.INDETERMINATE_VALUE:
            $checkbox.prop("checked", false);
            $checkbox.prop("indeterminate", true);
            break;
        default:    // unchecked
            $checkbox.prop("checked", false);
            $checkbox.prop("indeterminate", false);
            break;
    }
};

/**
 * Gets a checkbox tristate value of either checked, unchecked, or indeterminate. 
 * @param {$(input)} $checkbox
 * @return {true|false|Intputs.INDETERMINATE_VALUE} val
 */
var getTristateCheckboxValue = function ($checkbox) {
    if ($checkbox.prop("checked")) {
        return true;
    } else if ($checkbox.prop("indeterminate")) {
        return module.exports.INDETERMINATE_VALUE;
    }
    return false;
};


module.exports.INDETERMINATE_VALUE = INDETERMINATE_VALUE;
module.exports.INDETERMINATE_DISPLAY = INDETERMINATE_DISPLAY;
module.exports.setTristateCheckboxValue = setTristateCheckboxValue;
module.exports.getTristateCheckboxValue = getTristateCheckboxValue;
