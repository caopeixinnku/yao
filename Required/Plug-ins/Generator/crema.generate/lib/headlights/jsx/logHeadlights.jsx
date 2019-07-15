/*global stringIDToTypeID, ActionDescriptor, executeAction, DialogModes, params, alert */

// Required params:
//  - subcategory: subcategory to log in headlights (e.g. "CremaAction")
//  - event: feature name to log in headlights (e.g. "AddedAsset")
var headlightsActionID = stringIDToTypeID("headlightsLog");
var desc = new ActionDescriptor();
desc.putString(stringIDToTypeID("subcategory"), String(params.subcategory));
desc.putString(stringIDToTypeID("eventRecord"), String(params.event));
executeAction(headlightsActionID, desc, DialogModes.NO);
