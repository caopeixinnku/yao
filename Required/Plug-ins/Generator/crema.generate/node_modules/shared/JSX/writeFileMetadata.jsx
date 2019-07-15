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
/* global ExternalObject, File, XMPFile, XMPConst, XMPMeta, $ */


// Required param:
//{json2Path: The full path of the json2.js file
//filePath: he full path of the file to read,
//metadataStr:  The metadata we'll write to the file (as a string)
//}

// NOTE: documentation about xmpscript is here:
// https://wiki.corp.adobe.com/download/attachments/62395477/XMPScript.pdf

var json2Libfile = File(params.json2Path),
    file = File(params.filePath),
    metadataStr = params.metadataStr.replace(new RegExp('\\"', 'g'),'"'),
    xmpFile,
    xmpData;

if (json2Libfile.exists) {
    $.evalFile(json2Libfile);
}

function loadXMPLibrary() {
    if (!ExternalObject.AdobeXMPScript) {
        ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
    }
}

function unloadXMPLibrary() {
    if (ExternalObject.AdobeXMPScript) {
        ExternalObject.AdobeXMPScript.unload();
        ExternalObject.AdobeXMPScript = undefined;
    }
}

function writeItem(schemaNS, itemName, val) {
    xmpData.setProperty(schemaNS, itemName, val);
}

function writeArrayItems(schemaNS, itemName, vals) {
    var arrayLen = vals.length,
        j;
    for (j = 1; j < arrayLen; j++) {
        xmpData.appendArrayItem(schemaNS, itemName, vals[j], 0, XMPConst.ARRAY_IS_ORDERED);
    }
}

function writeAltArrayItems(schemaNS, itemName, localVals) {
    var arrayLen = localVals.length,
        j;
    for (j = 1; j < arrayLen; j++) {
        xmpData.setLocalizedText(schemaNS, itemName, null, "x-default", localVals[j]);
    }
}

loadXMPLibrary();
xmpFile = new XMPFile(file.fsName, XMPConst.UNKNOWN, XMPConst.OPEN_FOR_UPDATE);
xmpData = new XMPMeta();

if (xmpData) {
    var metadata = JSON.parse(metadataStr),
        count = metadata.length,
        i;

    // step through metadata
    for (i = 0; i < count; i++) {
        var oneItem = metadata[i],
            ns = oneItem.ns,
            itemName = oneItem.itemName,
            val = oneItem.val,
            vals = oneItem.vals,
            localVals = oneItem.localVals;
        if (val) {
            writeItem(ns, itemName, val);
        } else if (vals && vals.length) {
            writeArrayItems(ns, itemName, vals);
        } else if (localVals && localVals.length) {
            writeAltArrayItems(ns, itemName, localVals);
        }
    }

    // write updated metadata into the file
    if (xmpFile.canPutXMP(xmpData)) {
        xmpFile.putXMP(xmpData);
    }
}

xmpFile.closeFile(XMPConst.CLOSE_UPDATE_SAFELY);
unloadXMPLibrary();
