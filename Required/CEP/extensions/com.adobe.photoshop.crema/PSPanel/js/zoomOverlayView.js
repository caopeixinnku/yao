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
"use strict";

var _ = require("underscore"),
    Backbone = require('backbone'),
    Strings = require("./LocStrings"),
    Template = require("./TemplateLoader");

var ZoomOverlayView = Backbone.View.extend({
    
    className: "zoom-overlay",
    $zoomOverlayLevel: Backbone.$(),
    zoomInDisabled: false,
    zoomOutDisabled: false,
    
    events: {
        "click .zoom-overlay-level": "setDefaultZoom",
        "click .zoom-overlay-in": "zoomIn",
        "click .zoom-overlay-out": "zoomOut",
        "click .grid-background": "toggleDark"
    },
    
    template: _.template(Template.loadTemplate("../templates/zoomOverlayView.html")),
    
    initialize: function (options) {
        this.listenTo(this.model, "change:zoomLevel", this.renderZoomOverlay);
        this.listenTo(this.model, "change:dark", this.renderDark);
    },
    
    cacheElements: function () {
        this.$zoomOverlayLevel = this.$(".zoom-overlay-level");
        this.$zoomOverlayIn = this.$(".zoom-overlay-in");
        this.$zoomOverlayOut = this.$(".zoom-overlay-out");
    },
    
    render: function () {
        this.renderTemplate();
        this.cacheElements();
        this.renderZoomOverlay();
        this.renderDark();
        return this;
    },
    
    renderTemplate: function () {
        var context = Template.createTemplateContext(Strings, this.model.attributes);
        this.$el.html(this.template(context));
    },
    
    renderZoomOverlay: function () {
        var zoomLevel = this.model.get("zoomLevel") + "%";
        this.$zoomOverlayLevel.text(zoomLevel);
    },
    
    renderDark: function () {
        var dark = this.model.get("dark") ? true : false;
        this.$el.toggleClass("dark", dark);
    },
    
    setDefaultZoom: function () {
        this.model.set("zoomLevel", 100);
        this.$zoomOverlayIn.removeClass("disabled");
        this.$zoomOverlayOut.removeClass("disabled");
        this.zoomInDisabled = false;
        this.zoomOutDisabled = false;
    },

    zoomIn: function () {
        if (this.zoomInDisabled) {
            return;
        }
        var newLevel = this.model.zoomIn();
        this.zoomInDisabled = newLevel === this.model.getMaxZoomLevel();
        this.zoomOutDisabled = false;

        this.$zoomOverlayIn.toggleClass("disabled", this.zoomInDisabled);
        this.$zoomOverlayOut.toggleClass("disabled", this.zoomOutDisabled);
    },
    
    zoomOut: function () {
        if (this.zoomOutDisabled) {
            return;
        }
        var newLevel = this.model.zoomOut();
        this.zoomInDisabled = false;
        this.zoomOutDisabled = newLevel === this.model.getMinZoomLevel();

        this.$zoomOverlayIn.toggleClass("disabled", this.zoomInDisabled);
        this.$zoomOverlayOut.toggleClass("disabled", this.zoomOutDisabled);
    },
    
    toggleDark: function () {
        var cur = this.model.get("dark") ? true : false;
        this.model.set("dark", !cur);
    }
});

module.exports = ZoomOverlayView;