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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, unused: true, node: true */

"use strict";

var _ = require("underscore"),
    Backbone = require('backbone'),
    Template = require("./TemplateLoader"),
    CremaGlobal = require("./cremaGlobal.js"),
    GenableView = require("./genableView.js"),
    Strings = require("./LocStrings");

var GenableCollectionView = Backbone.View.extend({
    $genableList: Backbone.$(),
    
    initialize: function (options) {
        this.listenTo(this.collection, "remove", this.removeRenderedSetting);
        this.listenTo(this.collection, "add", this.renderViewItem);
        this.listenTo(this.collection, "change:rendableState", this.renderViewItem);
        this.listenTo(this.collection, "reset", this.clearView);
        this.initialClass = options.initialClass || "";
        this.listId = options.listId || "";
        this.viewId = options.viewId || "";
        this.filteredList = options.filteredList;
        this._renderedViews = [];
    },
    className: "box",
    ViewClass: GenableView,
    template: _.template(Template.loadTemplate("../templates/genableListView.html")),
    genablesEmpty: true,
    render: function () {
        var context = Template.createTemplateContext(Strings, {
            viewId: this.viewId,
            listId: this.listId,
            initialClass: this.initialClass
        });
        this.$el.html(this.template(context));
        this.$genableList = this.$("." + this.listId);
        this.collection.each(this.renderViewItem, this);
        return this;
    },
    removeRenderedSetting: function (model) {
        if (this._renderedViews[model.cid]) {
            this._renderedViews[model.cid].remove();
            delete this._renderedViews[model.cid];
        } else {
            CremaGlobal.window.console.warn("[genableCollectionView:removeRenderedSetting] tried to remove a model that has not rendered view");
        }
        if (Object.keys(this._renderedViews).length === 0) {
            this.clearView();
        }
    },
    clearView: function () {
        this.$genableList.empty();
        this.genablesEmpty = true;
    },
    renderViewItem: function (genableModel) {
        if (this.genablesEmpty) {
            this.$genableList.empty();
            this.genablesEmpty = false;
        }
        var genableView;

        if (this.canRenderItem(genableModel)) {
            genableView = new this.ViewClass({model: genableModel, selectionController: this.collection});
            this.$genableList.append(genableView.render().$el);
            this._renderedViews[genableModel.cid] = genableView;
        }
    },
    canRenderItem: function(genableModel) {
        if (this._renderedViews[genableModel.cid]) {
            return false;
        }
        return true;
    }
});

module.exports = GenableCollectionView;