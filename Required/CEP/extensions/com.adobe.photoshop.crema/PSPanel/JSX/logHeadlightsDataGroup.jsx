/*jslint plusplus: true */
/*global stringIDToTypeID, ActionDescriptor, executeAction, DialogModes */

// Required params:
//   - eventRecord: Data group name (e.g. "Layers")
//   - key: data key to log in headlights (e.g. "TotalLayers")
//   - value: data value to log in headlights (e.g. 5, true, or "png")

var headlightsActionID = stringIDToTypeID("headlightsInfo");
var desc = new ActionDescriptor(),
    groupName = "%1$s",
    key = "%2$s",
    val = "%3$s",
    keyArray = key.split(","),
    valArray = val.split(","),
    numKeys = keyArray.length,
    numVals = valArray.length,
    numPairs = Math.min(numKeys, numVals),
    i;

desc.putString(stringIDToTypeID("eventRecord"), groupName); // This is the data group name, please make sure it's identical across all calls and is self descriptive

for (i = 0; i < numPairs; i++) {
    // replace all occurrences of "&#44" with commas, since we might have done the other way before calling this.
    var val = valArray[i].replace("&#44", ",", "g");

    desc.putString(stringIDToTypeID(keyArray[i]), val);
}

executeAction(headlightsActionID, desc, DialogModes.NO);
