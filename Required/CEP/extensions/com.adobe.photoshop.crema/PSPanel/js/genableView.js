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

var Backbone = require('backbone'),
    _  = require("underscore"),
    Strings = require("./LocStrings"),
    StringUtils = require("shared/StringUtils"),
    Template = require("./TemplateLoader"),
    Modifiers = require("./utils/modifiers.js");

var GenableView = Backbone.View.extend({
    initialize: function (options) {
        var settings = this.model.get("layerSettings");
        this.listenTo(this.model, "change:name", this.renderName);
        this.listenTo(this.model, "change:selected", this.handleSelection);
        this.listenTo(this.model, "change:isActive", this.handleActiveChange);
        this.listenTo(this.model, "change:exportable change:overMaxSize", this.renderExportableAlert);
        this.listenTo(settings, "change:extension", this.renderFileFormat);
        this.listenTo(settings, "change:fileSize", this.renderFilesize);
        this.listenTo(settings, "change:scale change:canvasWidth change:canvasHeight change:originalDimensions change:previewDimensions", this.renderDimensions);
        this._selectionController = options.selectionController;
    },
    events: {
        "click .layer": "selectLayerClicked",
        "mouseenter .non-exportable-alert": "showOverMaxSizeAlertTooltip",
        "mouseleave .non-exportable-alert": "hideOverMaxSizeAlertTooltip",
    },
    tagName: "li",
    template: _.template(Template.loadTemplate("../templates/genableView.html")),
    render: function () {
        var context,
            previewModel = this.model.getActivePreview();
        
        context = Template.createTemplateContext(Strings, {
            name: this.model.get("name"),
            size: this.getDimensionsString(),
            filesize: "",
            extension: previewModel && previewModel.getFileExtension() || "",
            hideExportWarning: !this.model.get("overMaxSize") && this.model.get("exportable")
        });
        
        this.$el.html(this.template(context));
        this.$fileformat = this.$(".fileformat");
        this.$dimensions = this.$(".dimensions");
        this.$filesize = this.$(".filesize");
        this.$layer = this.$(".layer");
        this.$elName = this.$("span.title");
        this.$elExportableAlert = this.$("span.non-exportable-alert");
        this.$thumbnail = this.$(".thumbnail-img");
        this.$elExportableAlertTip = undefined; //note : this.$el.parents does not work here since this element is not yet added to DOM.
        this.handleSelection();
        this.renderFilesize();

        this.listenTo(this.model, "change:imageURL", this.renderThumbnail);
        if (this.model.get("imageURL")) {
            this.renderThumbnail();
        }
        return this;
    },
    renderFileFormat: function () {
        var previewModel = this.model.getActivePreview();
        this.$fileformat.text(previewModel && previewModel.getFileExtension() || "");
    },
    renderDimensions: function () {
        this.$dimensions.text(this.getDimensionsString());
    },
    getDimensionsString: function () {
        var previewModel = this.model.getActivePreview(),
            dim = previewModel && previewModel.getCanvasDimensions(),
            str = "";
        if (dim && dim.width && dim.height) {
            str = dim.width + " x " + dim.height;
        }
        return str;
    },
    renderFilesize: function () {
        var settings = this.model.getActivePreview(),
            filesize = settings && settings.get("fileSize"),
            filesizeStr = filesize ? Strings.formatBytesToLabel(filesize) : "";
        this.$filesize.text(filesizeStr);
    },
    handleActiveChange: function () {
        this.$layer.toggleClass("active", this.model.get("isActive"));
    },
    handleSelection: function () {
        this.$layer.toggleClass("selected", this.model.get("selected"));
    },
    renderThumbnail: function () {
        this.$thumbnail.css({
            "background-image": "url('" + this.model.get("imageURL") + "')"
        });
    },
    renderName: function () {
        this.$elName.text(this.model.get("name"));
    },
    renderExportableAlert: function () {
        this.$elExportableAlert.toggleClass("hide", !this.model.get("overMaxSize") && this.model.get("exportable"));
    },    
    selectLayerClicked: function (e) {
        if (e.isDefaultPrevented()) {
            return;
        }
        if (Modifiers.isToggleItemSelectionInListViewEvent(e)) {
            this._selectionController.toggleSelection(this.model);
        } else if (Modifiers.isRangeExclusiveSelectionEvent(e)) {
            this._selectionController.selectExclusiveRangeTo(this.model);
        } else if (Modifiers.isRangeAdditiveSelectionEvent(e)) {
            this._selectionController.selectAdditiveRangeTo(this.model);
        } else {
            this._selectionController.selectOnly(this.model);
        }        
    },
    _ensureExportableAlertTipElementInitialized: function () {
        if(this.$elExportableAlertTip === undefined) {
            var exportAlertTip = this.$el.parents(".container").children(".export-alert-tip");
             if(exportAlertTip.length == 1) {
                this.$elExportableAlertTip = exportAlertTip;
             }
        }
        return this.$elExportableAlertTip;
    },     
    showOverMaxSizeAlertTooltip: function (e) {
        if( this._ensureExportableAlertTipElementInitialized() === undefined) {
            return;
        }

        this.$elExportableAlertTip.removeClass("hide");        
        if(!this.model.get("exportable")) {
            this.$elExportableAlertTip.html(Strings.ALERT_NON_EXPORTABLE);
        } else {

            this.$elExportableAlertTip.html(StringUtils.formatStr(Strings.ALERT_MAX_SIZE_EXPORT, this.model.getSizesExceedingLimit()));
        }

        this.$elExportableAlertTip.css( "top", this.$elExportableAlert.offset().top + "px" );
    },
    hideOverMaxSizeAlertTooltip: function (e) {
        if( this._ensureExportableAlertTipElementInitialized() === undefined) {
            return;
        }

        this.$elExportableAlertTip.addClass("hide");
    }   

});

module.exports = GenableView;
