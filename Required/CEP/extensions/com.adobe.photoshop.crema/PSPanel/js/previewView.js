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
/*global  */
"use strict";

var _ = require("underscore"),
    Backbone = require("backbone"),
    Strings = require("./LocStrings"),
    Template = require("./TemplateLoader"),
    PreviewCanvasView = require("./previewCanvasView.js"),
    ZoomOverlayView = require("./zoomOverlayView.js");

var PreviewView = Backbone.View.extend({
    
    intervalId: 0,
    startPageX: 0,
    startPageY: 0,
    startScrollTop: 0,
    startScrollLeft: 0,
    previewCanvasView: null,
    zoomOverlayView: null,
    scroller: null,
    transitionEventsRegistered: false,
    $canvasContainer: Backbone.$(),
    $antiscrollWrap: Backbone.$(),
    $antiscrollInner: Backbone.$(),
    previewExistsInDom: false,
    centerScrollPos: { relX: 0.5, relY: 0.5 },
    template: _.template(Template.loadTemplate("../templates/previewView.html")),
    
    initialize: function (options) {
        _.bindAll(this, "refreshScroller", "refreshScrollerDelayEnd", "updateScrollPositions",
                  "mousedownStartsPan", "mousemoveUpdatesPan", "mouseupStopsPan");
        this.options = options;
        if (options.generatorModel) {
            this.listenTo(options.generatorModel, "docinfo-loaded", this.handleDocInfoLoaded);
        }
    },

    bindModelEvents: function() {
        this.listenTo(this.model, "change:zoomLevel", this.delayedRefreshScroller);
        this.listenTo(this.model, "change:canPan", this.renderCanPan);
        this.listenTo(this.model, "change:tipError", this.renderCanPan);
        this.listenTo(this.model, "change:canPan", this.updatePanStartListeners);
        this.listenTo(this.model, "change:panning", this.renderPanning);
        this.listenTo(this.model, "change:panning", this.updatePanningListeners);
        this.listenTo(this.model, "change:dark", this.renderDark);
        this.listenTo(this.collection, "change:currentSelection", this.showPreview);
        if (this.model.get("canPan")) {
            this.updatePanStartListeners();
        }
        this.listenTo(this.previewCanvasView, "resized", this.delayedRefreshScroller);
        this.listenTo(this.previewCanvasView, "loading-state-change", this.handleLoadingStateChange);
    },
    
    cacheElements: function () {
        this.$canvasContainer = this.$(".canvas-centering-container");
        this.$antiscrollWrap = this.$(".antiscroll-wrap");
        this.$antiscrollInner = this.$(".antiscroll-inner");
    },
    
    render: function () {
        this.renderTemplate();
        this.cacheElements();
        this.renderSubViews();
        this.renderCanPan();
        this.renderPanning();
        this.renderDark();
        this.renderZoomControl();
        if (!this.transitionEventsRegistered) {
            var $doc = Backbone.$(this.el.ownerDocument);
            $doc.on("webkitTransitionEnd", this.refreshScroller);
            this.transitionEventsRegistered = true;
        }

        return this;
    },

    renderZoomControl: function() {
        if (!this.zoomOverlayView) {
            this.zoomOverlayView = new ZoomOverlayView({model: this.model});
        }
        this.zoomOverlayView.render().$el.appendTo(this.$el);
    },
    renderTemplate: function () {
        var context = Template.createTemplateContext(Strings, this.model.attributes);
        this.$el.html(this.template(context));
    },

    addPreviewCanvasView: function() {
        if(!this.previewExistsInDom) {
            this.createScroller();
            this.previewCanvasView.$el.appendTo(this.$canvasContainer);
            this.previewExistsInDom = true;
            if (this.model.get("tipError")) {
                this.previewCanvasView.renderTipError();
            }
        }
    },
    renderSubViews: function () {
        if (!this.previewCanvasView) {
            this.previewCanvasView = new PreviewCanvasView({collection: this.collection, generatorModel: this.options.generatorModel, model: this.model});
        }
        this.previewCanvasView.render();
    },
    
    handleLoadingStateChange: function (loading) {
        if (loading) {
            this.$el.addClass("initialized");
        }
        this.$el.toggleClass("loading", loading);
        if (this.$el.hasClass("initialized")) {
            this.$el.toggleClass("loaded", !loading);
        }
    },
    
    renderCanPan: function () {
        var val = this.model.get("canPan") ? true : false,
            tipError = this.model.get("tipError");
        this.$antiscrollWrap.toggleClass("can-pan", val && !tipError);
    },
    
    renderPanning: function () {
        this.toggleClassFromModelProp("panning", "panning");
    },
    
    renderDark: function () {
        this.toggleClassFromModelProp("dark", "dark");
    },

    handleDocInfoLoaded: function(docInfo) {
        this.showPreview();
        this.bindModelEvents();
    },

    showPreview: function () {
        this.addPreviewCanvasView();
        this.$(".canvas-frame").css("display", "block");
    },

    toggleClassFromModelProp: function (className, modelProp) {
        var val = this.model.get(modelProp) ? true : false;
        this.$el.toggleClass(className, val);
    },
    
    createScroller: function () {
        this.scroller = this.$antiscrollWrap.antiscroll({x: true, y: true}).data("antiscroll");
        this.$antiscrollInner.css({width: "100%", height: "100%"});
    },
    
    delayedRefreshScroller: function () {
        //need to wait just a little because of transitions
        var delayInMs = 100;
        _.delay(this.refreshScrollerDelayEnd, delayInMs);
        //browser wants to keep the scrollbars at the same distance from the top/left, we want
        //the image to remain centered. Since the zoom has an transition on it we need to continually
        //update the scroll positions during the animation so our image stays centered
        this.updateScrollPositions({centerX: true, centerY: true});
        if (!this.intervalId) {
            this.intervalId = setInterval(_.partial(this.updateScrollPositions, {centerX: true, centerY: true}), 25);
        }
    },
    
    refreshScrollerDelayEnd: function () {
        clearInterval(this.intervalId);
        this.intervalId = 0;
        this.updateScrollPositions();
    },
    
    refreshScroller: function () {
        if (!this.scroller) {
            return;
        }
        if (this.$antiscrollWrap.width() !== this.$antiscrollInner.width()) {
            this.scroller.rebuild();
        } else {
            this.scroller.refresh();
        }
    },

    destroyScroller: function () {
        if (this.scroller) {
            this.scroller.destroy();
            this.scroller = null;
        }
    },
    
    updateScrollPositions: function (opts) {
        var sc = this.$antiscrollInner[0];
        this.refreshScroller();
        var centerX = opts && opts.centerX,
            centerY = opts && opts.centerY,
            availableHeight = sc.scrollHeight - sc.clientHeight,
            availableWidth = sc.scrollWidth - sc.clientWidth;
        
        this.model.set("canPan", availableHeight + availableWidth ? true: false);

        // When there is no longer a scrollbar (after zooming out), reset relative scroll pos
        // to default value (0.5)
        if (sc.scrollWidth <= sc.clientWidth) {
            this.centerScrollPos.relX = 0.5;
        }
        if (sc.scrollHeight <= sc.clientHeight) {
            this.centerScrollPos.relY = 0.5;
        }

        // centerScrollPos is the relative scroll position of pixel in center of view,
        // so translate that to window scroll pos
        if (centerX) {
            sc.scrollLeft = (this.centerScrollPos.relX * sc.scrollWidth) - (sc.clientWidth / 2);
        }
        if (centerY) {
            sc.scrollTop = (this.centerScrollPos.relY * sc.scrollHeight) - (sc.clientHeight / 2);
        }
    },
    
    scrollTo: function (x, y) {
        var sc = this.$antiscrollInner[0];

        sc.scrollLeft = x;
        sc.scrollTop = y;
        this.refreshScroller();
        
        // Keep track of relative scroll position of pixel in center of view so it can be kept
        // in center when zooming. `relX` and `relY` are ratios in range (0,1).
        if (sc.scrollWidth <= sc.clientWidth) {
            this.centerScrollPos.relX = 0.5;
        } else {
            this.centerScrollPos.relX = (sc.scrollLeft + (sc.clientWidth / 2)) / sc.scrollWidth;
        }
        if (sc.scrollHeight <= sc.clientHeight) {
            this.centerScrollPos.relY = 0.5;
        } else {
            this.centerScrollPos.relY = (sc.scrollTop + (sc.clientHeight / 2)) / sc.scrollHeight;
        }
    },
    
    updatePanStartListeners: function () {
        if (this.model.get("canPan")) {
            this.$el.on("mousedown", this.mousedownStartsPan);
        } else {
            this.$el.off("mousedown", this.mousedownStartsPan);
        }
    },
    
    updatePanningListeners: function () {
        var $doc = Backbone.$(this.el.ownerDocument);
        if (this.model.get("panning")) {
            $doc.on("mousemove", this.mousemoveUpdatesPan)
                .on("mouseup", this.mouseupStopsPan);
        } else {
            $doc.off("mousemove", this.mousemoveUpdatesPan)
                .off("mouseup", this.mouseupStopsPan);
        }
    },
    
    mousedownStartsPan: function (e) {
        var vertScrollerRightEdge = this.$antiscrollWrap.offset().left + this.$antiscrollWrap.width(),
            horzScrollerBotEdge = this.$antiscrollWrap.offset().top + this.$antiscrollWrap.height();
        
        // are we outside the wrapper?
        if (e.pageX > vertScrollerRightEdge || e.pageY > horzScrollerBotEdge) {
            return;
        }
        
        // are we on a scrollbar?
        var vertScrollerWidth = this.$(".antiscroll-scrollbar-vertical").width() || 0,
            horzScrollerHeight = this.$(".antiscroll-scrollbar-horizontal").height() || 0;
        if (vertScrollerRightEdge - e.pageX <= vertScrollerWidth ||
            horzScrollerBotEdge - e.pageY <= horzScrollerHeight) {
            return;
        }

        this.startPageX = e.pageX;
        this.startPageY = e.pageY;
        this.startScrollLeft = this.$antiscrollInner[0].scrollLeft;
        this.startScrollTop = this.$antiscrollInner[0].scrollTop;
        this.model.set("panning", true);
        e.preventDefault();
    },
    
    mousemoveUpdatesPan: function (e) {
        var dx = this.startPageX - e.pageX,
            dy = this.startPageY - e.pageY;
        this.scrollTo(this.startScrollLeft + dx, this.startScrollTop + dy);
        e.preventDefault();
    },
    
    mouseupStopsPan: function (e) {
        this.model.set("panning", false);
        e.preventDefault();
    }
});

module.exports = PreviewView;
