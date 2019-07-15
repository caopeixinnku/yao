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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true, node: true */

"use strict";

var Backbone = require('backbone'),
    _  = require("underscore"),
    Strings = require("./LocStrings"),
    Template = require("./TemplateLoader"),
    GenSettingView = require("./genSettingView.js");


var GenableDialogView = Backbone.View.extend({
    initialize: function () {
        this.listenTo(this.collection, "change:currentSelection", this.renderGenSettings);
    },
    template: _.template(Template.loadTemplate("../templates/genableDialogView.html")),
    render: function () {
        var context = Template.createTemplateContext(Strings, {});
        this.$el.html(this.template(context));
        this.$derived = this.$(".derived-assets");
        this.renderGenSettings();
        return this;
    },
    renderGenSettings: function () {
        var asset, genSettingView;

        this.$derived.empty();
        genSettingView = new GenSettingView({ collection: this.collection });
        this.$derived.append(genSettingView.render().$el);
    }
});

module.exports = GenableDialogView;
