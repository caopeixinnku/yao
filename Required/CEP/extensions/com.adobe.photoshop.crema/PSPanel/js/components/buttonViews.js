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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true, node: true*/
"use strict";

var Backbone = require('backbone');

var ButtonView = Backbone.View.extend({
    events: {
        "click": "handleClick"
    },
    initialize: function (options) {
        if (options.clickHandler) {
            this.handleClick = options.clickHandler;
        }
        this.options = options || {};
    },
    handleClick: function () {
        return;
    }
});

var OSButton = ButtonView.extend({
    tagName: "button",
    render: function () {
        if (this.options.isDefault) {
            this.$el.addClass("active");
        }
        this.$el.text(this.options.text || "");
        return this;
    }
});

var IconButton = ButtonView.extend({
    tagName: "div",
    className: "icon",
    render: function () {
        if (this.options.type) {
            this.$el.addClass(this.options.type);
        }
        if (this.options.hasContextMenu) {
            this.$el.addClass("additional");
        }
        return this;
    }
});

module.exports = {
    OSButton: OSButton,
    IconButton: IconButton
};