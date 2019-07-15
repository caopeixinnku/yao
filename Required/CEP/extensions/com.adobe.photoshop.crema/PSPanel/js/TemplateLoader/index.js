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

var _ = require("underscore"),
    path = require('path'),
	fs = require('fs'),
	cache = {},
	getPath = function (parentModule) {
		var currentPathName = path.dirname(parentModule.filename),
			parts = currentPathName.split(path.sep);

		while (parts[parts.length - 1] !== "js" || !parentModule.parent) {
			parentModule = parentModule.parent;
			currentPathName = path.dirname(parentModule.filename);
			parts = currentPathName.split(path.sep);
		}

		return currentPathName;
	},
	parentPath = getPath(module.parent || module);

exports.loadTemplate = function (requirePath) {
	if (!cache[requirePath]) {
		var fileContents = fs.readFileSync(path.join(parentPath, requirePath));
		if (fileContents) {
			cache[requirePath] = fileContents.toString();
		}
	}
	return cache[requirePath];
};

exports.createTemplateContext = function (Strings, context) {
	//add the global strings object
    var clone = _.clone(context);
	clone.Strings = Strings;
	return clone;
};
