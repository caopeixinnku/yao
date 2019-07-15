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
/*global define, require, module */

"use strict";

module.exports = function (userDimensions, imageDimensions, stableDimension) {
    var ratio = imageDimensions.width / imageDimensions.height;
    var longDimension = ratio > 1 ? "width" : "height";
    if (!userDimensions.height || userDimensions.height === 0) {
        userDimensions.height = userDimensions.width / ratio;
    }
    if (!userDimensions.width || userDimensions.width === 0) {
        userDimensions.width = userDimensions.height * ratio;
    }
    
    userDimensions.scale = Math.round(10000 * userDimensions.width / imageDimensions.width) / 100;
    //we just rounded the scale to 2 places. However because we rounded the scale and always ceil the
    //dimensions we might have just bumped the desired result by 1 pixel. To help keep that dimension
    //stable and round-tripable we test to see if the scale will give is the number we want. If it doesn't
    //we'll addjust the scale to the floor to see if it gives us the number we want.
    if (stableDimension) {
        var userVal = parseInt(userDimensions[stableDimension], 10),
            imgVal = parseInt(imageDimensions[stableDimension], 10),
            floorScale = Math.floor(10000 * userDimensions.width / imageDimensions.width) / 100;
        if (userVal !== Math.ceil(imgVal * userDimensions.scale / 100)) {
            if (userVal === Math.ceil(imgVal * floorScale / 100) && userDimensions.scale !== floorScale) {
                userDimensions.scale = floorScale;
            }
        }
    }

    //sshrivas 07/26/2015 : Fix for 1px-rounding-bug
    //As we pass Long Dimension for both width and height in the OutputRect parameter during the Pixmap
    //generation to Generator we need to make sure that we are rounding the longer dimension correctly.
    //Try to re-produce short dimension from the rounded value of longer dimension if you dont get the
    //Desired value, decrease value of longer dimension by 1 pixel to eliminate the rounding error.
    if (longDimension != stableDimension) {
        if(ratio < 1) {
            userDimensions.roundedHeight = Math.ceil(userDimensions.height);
            userDimensions.roundedWidth = Math.ceil( imageDimensions.width * (userDimensions.roundedHeight/imageDimensions.height));
            
            if( userDimensions.roundedWidth > userDimensions.width ) {
                userDimensions.height = userDimensions.roundedHeight - 1 ;
            }
        } else if(ratio > 1){
            userDimensions.roundedWidth = Math.ceil(userDimensions.width);
            userDimensions.roundedHeight = Math.ceil( imageDimensions.height * (userDimensions.roundedWidth/imageDimensions.width));
            
            if( userDimensions.roundedHeight > userDimensions.height ) {
                userDimensions.width = userDimensions.roundedWidth - 1 ;
            }            
        }
    }
    
    return userDimensions;
};