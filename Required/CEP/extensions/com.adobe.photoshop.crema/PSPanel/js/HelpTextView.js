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

/*jslint vars: true, node: true, plusplus: true, devel: true, nomen: true, indent: 4, node: true */
"use strict";

var _               = require("underscore"),
    Q               = require("q"),
    Backbone        = require('backbone'),
    CremaGlobal     = require("./cremaGlobal.js"),
    Template        = require("./TemplateLoader"),
    Strings         = require("./LocStrings");




var HelpTextView = Backbone.View.extend({
    template: _.template(Template.loadTemplate("../templates/helpText.html")),
    tagName: "span",
    className: "help-text",
    events: {
        "click a": "openURL"
    },
   
    initialize: function (options) {
    },
    render: function() {
        var templateContext = Template.createTemplateContext(Strings, {});
        this.$el.html(this.template(templateContext));
        return this;
    },
    openURL: function(e) {
        var linkText = Backbone.$(e.target).attr("href");
        CremaGlobal.window.cep.util.openURLInDefaultBrowser(linkText);
        e.preventDefault();
    }
});

module.exports = HelpTextView;
