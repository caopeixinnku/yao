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
/* global ExternalObject, File, XMPConst, XMPMeta, app, $ */


// Required params:
// {
//  json2Path: The full path of the json2.js file
//  includeUserMetadata a boolean to indicate if user metadata should be included
// }

// NOTE: documentation about xmpscript is here:
// https://wiki.corp.adobe.com/download/attachments/62395477/XMPScript.pdf

    var json2Libfile = File(params.json2Path),
        includeUserMetadata= params.includeUserMetadata,
        xmpData,
        result = [];

if (json2Libfile.exists) {
    $.evalFile(json2Libfile);
}

function loadXMPLibrary() {
    if (!ExternalObject.AdobeXMPScript) {
        try{
            ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
        } catch (e) {
            result = "Exception loading AdobeXMPScript: " + e;
            return false;
        }
    }
    return true;
}

function unloadXMPLibrary() {
    if (ExternalObject.AdobeXMPScript) {
        try {
            ExternalObject.AdobeXMPScript.unload();
            ExternalObject.AdobeXMPScript = undefined;
        } catch (e) {
            result = "Exception unloading AdobeXMPScript: " + e;
        }
    }
}

function readItem(schemaNS, itemName) {
    var partialRes = {},
        val = xmpData.getProperty(schemaNS, itemName);

    if (val !== undefined) {
        partialRes = {
            "ns": schemaNS,
            "itemName": itemName,
            "val": "" + val
        };
        result.push(partialRes);
    }
}

function readArrayItems(schemaNS, itemName) {
    var count = xmpData.countArrayItems(schemaNS, itemName),
        i,
        partialRes;

    if (count === 0) {
        return;
    }

    partialRes = {
            "ns": schemaNS,
            "itemName": itemName,
            "vals": [""]
        };

    for (i = 1; i <= count; i++) {
        partialRes.vals[i] = xmpData.getArrayItem(schemaNS, itemName, i).value;
    }
    result.push(partialRes);
}

function readAltArrayItems(schemaNS, itemName) {
    var count = xmpData.countArrayItems(schemaNS, itemName),
        i,
        item,
        partialRes;

    if (count === 0) {
        return;
    }

    partialRes = {
            "ns": schemaNS,
            "itemName": itemName,
            "localVals": [""]
        };

    for (i = 1; i <= count; i++) {
        item = xmpData.getArrayItem(schemaNS, itemName, i);
        partialRes.localVals[i] = "" + xmpData.getLocalizedText(schemaNS, itemName, null, "x-default");
    }
    result.push(partialRes);
}

if (loadXMPLibrary()) {
    var rawXmp = app.activeDocument.xmpMetadata.rawData;
    xmpData = new XMPMeta(rawXmp);

    if(xmpData) {
        // Documentation about the various XMP properties and their value types is here:
        // http://www.iptc.org/std/IIM/4.1/specification/IPTC-IIM-Schema4XMP-1.0-spec_1.pdf
        // In particular, some of these are essentially plain text ("webstatement", etc),
        // some are arrays of plain text ("creator"), and some are "alt" arrays, which *can*
        // contain value strings in various languages ("title, "rights"), although in Photoshop
        // only contain a single string.
        
        // Only include this set if it was requested to include copyright and contact info
        if (includeUserMetadata) {
            readArrayItems(XMPConst.NS_DC, "creator");

            readAltArrayItems(XMPConst.NS_DC, "title");
            readAltArrayItems(XMPConst.NS_DC, "rights");

            readItem(XMPConst.NS_PHOTOSHOP, "AuthorsPosition");

            readItem(XMPConst.NS_XMP, "CreatorTool");

            readItem(XMPConst.NS_XMP_RIGHTS, "Marked");
            readItem(XMPConst.NS_XMP_RIGHTS, "WebStatement");
            readAltArrayItems(XMPConst.NS_XMP_RIGHTS, "UsageTerms");

            readItem(XMPConst.NS_IPTC_CORE,"CreatorContactInfo/Iptc4xmpCore:CiAdrExtadr");
            readItem(XMPConst.NS_IPTC_CORE,"CreatorContactInfo/Iptc4xmpCore:CiAdrCity");
            readItem(XMPConst.NS_IPTC_CORE,"CreatorContactInfo/Iptc4xmpCore:CiAdrRegion");
            readItem(XMPConst.NS_IPTC_CORE,"CreatorContactInfo/Iptc4xmpCore:CiAdrPcode");
            readItem(XMPConst.NS_IPTC_CORE,"CreatorContactInfo/Iptc4xmpCore:CiAdrCtry");
            readItem(XMPConst.NS_IPTC_CORE,"CreatorContactInfo/Iptc4xmpCore:CiTelWork");
            readItem(XMPConst.NS_IPTC_CORE,"CreatorContactInfo/Iptc4xmpCore:CiEmailWork");
            readItem(XMPConst.NS_IPTC_CORE,"CreatorContactInfo/Iptc4xmpCore:CiUrlWork");
        }

        XMPMeta.registerNamespace("http://ns.google.com/photos/1.0/panorama/","GPano");

        readItem("http://ns.google.com/photos/1.0/panorama/","ProjectionType");
        readItem("http://ns.google.com/photos/1.0/panorama/","UsePanoramaViewer");
        readItem("http://ns.google.com/photos/1.0/panorama/","CroppedAreaImageWidthPixels");
        readItem("http://ns.google.com/photos/1.0/panorama/","CroppedAreaImageHeightPixels");
        readItem("http://ns.google.com/photos/1.0/panorama/","FullPanoWidthPixels");
        readItem("http://ns.google.com/photos/1.0/panorama/","FullPanoHeightPixels");
        readItem("http://ns.google.com/photos/1.0/panorama/","CroppedAreaLeftPixels");
        readItem("http://ns.google.com/photos/1.0/panorama/","CroppedAreaTopPixels");
        readItem("http://ns.google.com/photos/1.0/panorama/","PoseHeadingDegrees");
        readItem("http://ns.google.com/photos/1.0/panorama/","PosePitchDegrees");
        readItem("http://ns.google.com/photos/1.0/panorama/","PoseRollDegrees");
    }
    unloadXMPLibrary();
}

JSON.stringify(result);
