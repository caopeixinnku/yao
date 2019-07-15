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

/*jslint vars: true, node: true, plusplus: true, devel: true, nomen: true, indent: 4, unused: true */
"use strict";

var _ = require("underscore"),
    Backbone = require("backbone"),
    Strings = require("./LocStrings"),
    CremaGlobal = require("./cremaGlobal.js"),
    Template = require("./TemplateLoader");

var DEFAULT_CANVAS_W = 0,
    DEFAULT_CANVAS_H = 0;

var PreviewCanvasView = Backbone.View.extend({
    
    className: "canvas",
    
    $preview: Backbone.$(),
    $svgPreview : Backbone.$(),
    $canvas: Backbone.$(),
    $spinner: Backbone.$(),
    $centeringContainer: Backbone.$(),
    canvasCtx: null,
    renderedModelCid: undefined,

    initialize: function (options) {
        _.bindAll(this, "renderZoomForNewImage", "clearPreviewFromLoadError");
        this.generatorModel = options.generatorModel;

        this.listenTo(this.model, "change:zoomLevel", this.renderImageZoom);
        this.listenTo(this.model, "change:dark", this.renderDark);
        this.listenTo(this.model, "change:srcModel change:loadError", this.renderLoadingVisibility);
        this.listenTo(this.model, "change:previewURL", this.renderPreviewUrl);
        this.listenTo(this.generatorModel, "change:generatorClosed", this.renderLoadingVisibility);
        this.listenToCollection(this.collection);
        
        this._processingTemplate = _.template(Template.loadTemplate("../templates/processingView.html"));
        this._spinnerTemplate = _.template(Template.loadTemplate("../images/Cur_Spinner_11_11-2x.svg"));
        this._errorTemplate = _.template(Template.loadTemplate("../templates/previewErrors.html"));
        this._initialLoad = true;
    },

    _learnMore: function () {
        CremaGlobal.window.cep.util.openURLInDefaultBrowser(Strings.PREVIEW_GOURL);
    },
    
    listenToCollection: function (collection) {
        if (this._activeListeningCollection) {
            this.stopListening(this._activeListeningCollection, "change:currentSelection");
            this.stopListening(this._activeListeningCollection, "add remove reset change:isActive change:rendableState");
        }
        
        this._activeListeningCollection = collection;
        
        if (collection) {
            this.listenTo(collection, "change:currentSelection", this.renderImageSrc);
            this.listenTo(collection, "add remove reset change:isActive change:rendableState", _.partial(this.renderSelectionFromCollection, collection));
        }
    },
    
    render: function () {
        this.$preview = Backbone.$("<img>").addClass("preview-img").appendTo(this.$el);
        this.$canvas = Backbone.$("<canvas></canvas>").addClass("preview-img-pixel-zoom").addClass("hide").appendTo(this.$el);
        this.$canvasOverlay = Backbone.$("<div></div>").addClass("preview-canvas-overlay").appendTo(this.$el);
        this.$centeringContainer = Backbone.$('.canvas-centering-container');
        this.renderSpinner();
        this.renderImageZoom();
        this.renderDark();
        this.renderSelectionFromCollection(this.collection);
        return this;
    },
    
    renderSelectionFromCollection: function (collection) {
        var sel = collection.findBy("isActive", true);
        if (sel) {
            this.clearCanvasImage();
            this.renderImageSrc(sel);
        } else {
            this.clearPreview();
        }
    },
    
    renderImageSrc: function (model) {
        this._activeModel = model;
        this._renderImageSrcFromModel();
    },
    
    _renderImageSrcFromModel: function () {
        var model = this._activeModel,
            selected,
            resetZoomSize,
            previewURL,
            newCid,
            isDefaultImg,
            layerSettings,
            srcModel = this.model.get("srcModel");

        
        this.clearOverlay();
        if (model && (model.getActivePreview() !== model || model.get("imageURL"))) {
            selected = model.getActivePreview();
            newCid = model.cid;
            resetZoomSize = this.layerCid !== newCid;
            layerSettings = model.get("layerSettings");
            isDefaultImg = !layerSettings;
            
            this.updatePreviewModel(model, selected);

            previewURL = selected.get("imageURL");
            
            if (previewURL) {
                this._initialLoad = false;
                if (isDefaultImg) {
                    this.$preview.addClass("default-rendering");
                } else {
                    this.$preview.removeClass("default-rendering");
                }
                this.layerCid = newCid;
                this.model.set("previewURL", previewURL, {resetZoomSize: resetZoomSize});
            }
        } else {
            if (model) {
                this.updatePreviewModel(model, null);
            } else {
                this.layerCid  = 0;
            }
            //no assets, reset the view...
            this.clearPreview();
        }
        if (srcModel && !srcModel.get("loading")) {
            this.renderDarkOverlayWithHole();
        }
    },
    
    clearOverlay: function () {
        var overlayCSS = {border: 0, left: 0, right: 0, width: 0, height: 0};
        this.$canvasOverlay.css(overlayCSS);
    },
    
    renderDarkOverlayWithHole: function () {
        var srcModel = this.model.get("srcModel"),
            isSVG = this.model.get("isSVG"),
            pixelRatio = CremaGlobal.window.devicePixelRatio || 1,
            zoomFactor = this.model.get("zoomLevel") / 100 / pixelRatio,            
            canvasW = srcModel && srcModel.get("canvasWidth") ? Math.round((srcModel.get("canvasWidth") * zoomFactor)) : 0,
            canvasH = srcModel && srcModel.get("canvasHeight") ? Math.round((srcModel.get("canvasHeight") * zoomFactor)) : 0,
            previewW = isSVG ? this.$svgPreview.width() : this.$preview.width(),
            previewH = isSVG ? this.$svgPreview.height() : this.$preview.height(),
            overlayW = canvasW ? canvasW : previewW,
            overlayH = canvasH ? canvasH : previewH,
            overlayCSS = {
                          width: overlayW, height: overlayH
                         };
        this.$canvasOverlay.css(overlayCSS);
    },
    
    renderPreviewUrl: function (model, val, options) {
        var previewURL = this.model.get("previewURL") || "",
            resetZoomSize = options && options.resetZoomSize;
        this.$preview.off();
        this.$preview.attr("src", previewURL);
        
        if (!previewURL) {
            return;
        }

        if (previewURL.indexOf(".svg?") > 0) {
            this.$svgPreview.remove();
            this.$svgPreview = Backbone.$('<object class="svg-preview-object" data="' + previewURL + '" type="image/svg+xml" height="100%" width="100%"></object>').appendTo(this.$el);
            
            this.$preview.addClass("hide");
            this.$canvas.addClass("hide");
            this.model.set("isSVG", true);
        } else {
            this.model.set("isSVG", false);
            this.$svgPreview.remove();
            this.$preview.removeClass("hide");
        }

        this.model.set("loadError", false);
        if (this.$preview[0].complete) {
            this.renderZoomForNewImage(resetZoomSize);
        } else {
            this.$preview.one("load", _.partial(this.renderZoomForNewImage, resetZoomSize));
            this.$preview.one("error", _.partial(this.clearPreviewFromLoadError, previewURL));
        }
    },
    
    renderSizeForZoom: function () {
        var newSize = this.getRenderZoomSize(),
            cssVal = {width: "100%", height: "100%"};
        
        if (newSize.width) {
            cssVal.width = newSize.width + "px";
        }
        if (newSize.height) {
            cssVal.height = newSize.height + "px";
        }
        this.clearOverlay();
        this.$el.css(cssVal);
        this.trigger("resized");
    },
    
    formatUrlForCss: function (url) {
        var encoded = encodeURI(url),
            openParenEntity = "&#" + "(".charCodeAt(0) + ";",
            closeParenEntity = "&#" + ")".charCodeAt(0) + ";",
            parenEncoded = encoded.replace(/\(/g, openParenEntity).replace(/\)/g, closeParenEntity);
        
        return "url(" + parenEncoded + ")";
    },
    showTipError: function (errorType) {
        this.model.set("tipError", true);
        if (!this.$tipError) {
            var context = Template.createTemplateContext(Strings, {
                errorType: errorType
            });
            this.$tipError = Backbone.$(this._errorTemplate(context));
            if (this.$el.parent().length) {
                this.tipErrorInDom = true;
                this.$el.parent().append(this.$tipError);
            }
            this.$tipText = this.$tipError.find("p");
            this.$tipImage = this.$tipError.find("div");
            this.$tipError.delegate(".learn-more", "click", this._learnMore);
        }
        if (!this.tipErrorInDom && this.$el.parent().length) {
            this.tipErrorInDom = true;
            this.$el.parent().append(this.$tipError);
        }
        this.$tipImage.removeClass();
        this.$tipImage.addClass("graphic-error");
        if (errorType === Strings.PREVIEW_EMPTY_GROUP || errorType === Strings.PREVIEW_EMPTY_ARTBOARD) {
            this.$tipImage.addClass("graphic-folder");
        } else if (errorType === Strings.PREVIEW_CONFLICT || errorType === Strings.PREVIEW_EMPTY_IMG) {
            this.$tipImage.addClass("graphic-layer");
        } else {
            this.$tipImage.addClass("graphic-none");
        }
        this.$tipText.text(errorType);
        
        this.$centeringContainer.css("background", "none");
        this.$el.hide();
    },
    renderTipError: function () {
        var srcModel = this.model.get("srcModel"),
            layerModel = this.model.get("layerModel"),
            errorMessage = this.generatorModel.getPreviewErrorMessage(srcModel, layerModel);

        if (errorMessage) {
            this.showTipError(errorMessage);
            return true;
        }

        if (this.model.has("tipError")) {
            this.model.unset("tipError");
        }
        this.$el.show();
        if (this.$tipError) {
            this.$tipError.undelegate();
            this.$tipError.remove();
            this.$tipError = null;
            this.$tipText = null;
        }
        return false;
    },
    updatePreviewModel: function (layerModel, newPreviewModel) {
        var prevModel = this.model.get("srcModel");
        if (prevModel === newPreviewModel) {
            return;
        }
        if (prevModel) {
            this.stopListening(prevModel);
        }
        if (layerModel && newPreviewModel) {
            this.model.unset("tipError");
            this.listenTo(newPreviewModel, "change:imageURL", _.partial(this.renderImageSrc, layerModel));
            this.listenTo(newPreviewModel, "change:loading change:namesConflict change:invisible change:hasZeroBounds", this.renderLoadingVisibility);
        }


        this.model.set({srcModel: newPreviewModel,
                        layerModel: layerModel,
                        isSVG: false});
        this.renderTipError();
    },
    
    clearPreviewFromLoadError: function (expectUrl) {
        if (this.$preview.attr("src") === expectUrl && !this.model.get("tipError")) {
            this.clearPreview();
            this.model.set("loadError", true);
        }
    },
    
    clearPreview: function () {
        this.updatePreviewModel();
        this.model.unset("previewURL");
        
        this.$preview.removeAttr("src");
        this.$preview.addClass("hide");
        this.clearCanvasImage();
        
        this.setDefaultZoom();
        this.$el.css({
            width: DEFAULT_CANVAS_W,
            height: DEFAULT_CANVAS_H
        });
        this.trigger("resized");
    },

    clearCanvasImage: function () {
        if (this.canvasCtx) {
            this.canvasCtx.clearRect(0, 0, this.$canvas.width(), this.$canvas.height());
        }
    },
    
    renderZoomForNewImage: function (resetZoomSize) {
        this.setMaxZoom();
        if (resetZoomSize) {
            this.setImageFitZoom();
        }
        this.renderImageZoom();
    },
    
    renderImageZoom: function () {
        this.renderSizeForZoom();
        var zoomLevel = this.model.get("zoomLevel"),
            isSVG = this.model.get("isSVG");
        
        if (isSVG) {
            this.renderDarkOverlayWithHole();
            return;
        }
        
        if (zoomLevel <= 100) {
            this.$canvas.addClass("hide");
            this.$preview.removeClass("hide");
            this.renderImageZoomUsingPreviewImage(zoomLevel);
        } else {
            this.$canvas.removeClass("hide");
            this.$preview.addClass("hide");
            //need to scale the img and then draw the canvas
            this.renderImageZoomUsingPreviewImage(zoomLevel);
            this.renderImageZoomUsingPixelatedCanvas(zoomLevel);
        }

        this.renderDarkOverlayWithHole();
    },
    
    renderImageZoomUsingPreviewImage: function (zoomLevel) {
        var newSize = this.getRenderZoomSize(zoomLevel);
        this.$preview.width(newSize.width).height(newSize.height);
    },
    
    renderImageZoomUsingPixelatedCanvas: function (zoomLevel) {
        if (!this.canvasCtx && this.$canvas[0].getContext) {
            this.canvasCtx = this.$canvas[0].getContext("2d");
        }
        if (!this.canvasCtx) {
            return;
        }
        try {
            var newSize = this.getRenderZoomSize(zoomLevel);
            this.canvasCtx.canvas.height = newSize.height;
            this.canvasCtx.canvas.width = newSize.width;
            this.canvasCtx.ImageSmoothingEnabled = false;
            this.canvasCtx.webkitImageSmoothingEnabled = false;
            this.canvasCtx.drawImage(this.$preview[0], 0, 0, newSize.width, newSize.height);
        } catch (e) {
            CremaGlobal.window.console.log("exception in renderImageZoomUsingPixelatedCanvas: " + e.message);
        }
    },
    
    renderDark: function () {
        var dark = this.model.get("dark") ? true : false;
        this.$el.toggleClass("dark", dark);
    },
    
    renderSpinner: function () {
        var context = Template.createTemplateContext(Strings, {});
        this.$spinner = Backbone.$("<div></div>").addClass("spinner canvas-loading");
        var $imgLoader = Backbone.$("<div></div>").addClass("canvas-loading-img").appendTo(this.$spinner);
        $imgLoader.html(this._spinnerTemplate(context));
        this.$spinner.append(this._processingTemplate(context));
        
        this.$spinner.removeClass("hide");
        this.$centeringContainer.append(this.$spinner);
    },
    
    renderLoadingVisibility: function () {
        if (this.renderTipError()) {
            this.trigger("loading-state-change", true);
            this.$spinner.addClass("hide");
            return;
        }
        var src = this.model.get("srcModel"),
            showLoading = !src || src.get("loading"),
            showLoadingCanvas = showLoading || this.model.get("loadError");
        this.trigger("loading-state-change", showLoadingCanvas);
        
        this.$spinner.toggleClass("hide", !showLoading || !this._initialLoad);
    },
    
    // calculate pixel size based on zoom level and devicePixelRatio
    getRenderZoomSize: function (zoomLevel) {
        var zoom = zoomLevel || this.model.get("zoomLevel"),
            pixelRatio = CremaGlobal.window.devicePixelRatio || 1,
            imgHeight = this.$preview[0].naturalHeight || DEFAULT_CANVAS_H,
            imgWidth = this.$preview[0].naturalWidth || DEFAULT_CANVAS_W,
            newHeight = (imgHeight * zoom / 100) / pixelRatio,
            newWidth = (imgWidth * zoom / 100) / pixelRatio;
        
        return { height: newHeight,
                 width: newWidth };
    },
    
    setImageFitZoom: function () {
        var $parent = this.$el.parents(".canvas-frame"),
            parentWidth = $parent.width(),
            parentHeight = $parent.height(),
            zoomLevel = 100,
            prevZoomLevel,
            newSize = this.getRenderZoomSize(zoomLevel);
        
        while (zoomLevel && (newSize.height > parentHeight || newSize.width > parentWidth)) {
            prevZoomLevel = zoomLevel;
            zoomLevel = this.model.getNextZoomLevel(-1, zoomLevel);
            newSize = this.getRenderZoomSize(zoomLevel);
        }
            
        this.model.set("zoomLevel", zoomLevel || prevZoomLevel);
    },
    
    setDefaultZoom: function () {
        this.model.set("zoomLevel", 100);
    },
    
    // Find the max level this image can be zoomed to without going past 120M pixels in area, or 32767 in w or h,
    // which is about the most canvas can always handle, and set it on the model.
    // Start with 100, since we don't use the canvas until zoom is > 100.
    setMaxZoom: function () {
        var testZoomLevel = 100,
            safeZoomLevel = 100,
            newSize = this.getRenderZoomSize(testZoomLevel),
            MAX_DIM = 32767,        // this is exactly correct for chrome
            MAX_AREA = 120000000;   // this is determined by trial and error; supposedly it's 268,435,456, but that's too big in my testing.
        
        while (testZoomLevel && newSize.height < MAX_DIM && newSize.width < MAX_DIM && newSize.height * newSize.width < MAX_AREA) {
            safeZoomLevel = testZoomLevel;
            testZoomLevel = this.model.getNextZoomLevel(1, testZoomLevel);
            newSize = this.getRenderZoomSize(testZoomLevel);
        }
        this.model.set("maxZoomLevel", safeZoomLevel);
    }
});

module.exports = PreviewCanvasView;
