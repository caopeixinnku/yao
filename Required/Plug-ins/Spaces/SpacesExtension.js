/*
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/** This file describes the native extensions that allows a Spaces application
to interact with Photoshop.

General objects
This following section describes common objects and patterns used by the
interface.

Most functions are asynchronous and take a callback function that is invoked when the
function completes.
Callbacks are not executed if the URL is reloaded before the function has completed, or if
the host application is shut down before completion.
An asynchronous method returns a task ID. The task ID is unique within a session.

A completion callback will take one or more arguments.
The first argument to a completion callback is always an "err" argument.
If a command succeeds then the value of the err object is undefined, or
it is an object with a "number" key whose value is 0.
When the command fails, then an object is returned. The returned object has the
following values:
"number" (number, required)
    An error code describing the failure. @see _spaces.errorCodes
"message" (string, optional)
    An english string describing failure.
"stack" (string, optional)
    A stack describing the failure location.
"fileName" (string, optional)
    Name of the file where the error occurred
"lineNumber" (number, optional)
    Line number for the location of the error
"columnNumber" (number, optional)
    Column number for the location of the error


"paintOptions"
This object describes how the Photoshop canvas is updated with respect to
OS drawing.
When this object is not present, then Photoshop will use its default
update logic.
The following keys are recognized:
"immediateUpdate" (boolean)
    If true then the Photoshop canvas is updated immediately. This typically
    means that the canvas is updated after executing one or more commands
    right before executing the completion callback.
"quality" (string)
    Describes the update quality. Possible values are: "draft", "medium", "final".
    When draft is specified then the update may not be fully accurate. "draft" is
    used when a number of subsequent commands are executed. When "final" is specified
    then the canvas is updated fully to its final form. "medium" is a quality that is
    between draft and final.
    When "draft" or "medium" is provided then Photoshop will automatically update
    to "final" at a later time.
"documentId" (int)
    The ID of the document to update. If this key is missing, or if it is less than 0,
    then the active document will be used as the target.
*/


var _spaces;

if (!_spaces)
  _spaces = {};

// ==========================================================================
// Definitions for the _spaces scope

/** _spaces.version
Returns the version for the Spaces runtime layer.
The version has three component: major, minor, patch
When the runtime breaks backwards compatibility the major version is updated.
When the runtime adds new functionality without breaking existing functionality,
the minor version is updated.
When the runtime is updated without changing the API, then the patch version
is updated
*/
Object.defineProperty(_spaces, "version", {
    writeable: false,
    enumerable: true,
    configurable: false,
    get: function () {
        native function pgGetVersion();
        return pgGetVersion();
    }
});

/** _spaces.feature_flags
Returns feature-flags for the current context.
This value is set in the manifest.json file.
*/
Object.defineProperty(_spaces, "feature_flags", {
    writeable: false,
    enumerable: true,
    configurable: false,
    get: function () {
        native function pgGetFeatureFlags();
        return pgGetFeatureFlags();
    }
});

/* Error codes used by Spaces.
Typically such information is returned in the err object to callback methods.
@see description in "Common objects"
*/
_spaces.errorCodes = {
    /** Designates success.
    Typically undefined is returned as the err object on success, but if an
    err object with number equal to NO_ERROR is returned, then this state also
    designates success.
    */
    NO_ERROR:0,
    
    /** Some error has occurred.
    */
    UNKNOWN_ERROR:1,

    /** The user canceled a request
    */
    UNKNOWN_USER_CANCELED:2,

    /** A request could not be dispatched to the host process.
    */
    CANT_DISPATCH_MESSAGE_TO_HOST:101,

    /** General argument error.
    The message of the returned error object may contain additional information
    about the failure type.
    */
    ARGUMENT_ERROR:1000,

    /** The javascript request is missing a required callback argument.
    The callback must be the last argument in the javascript call
    */
    MISSING_NOTIFIER:1001,

    /** The host rejected the request. This error can for example be returned
    if the host is in a modal state that prevents it from processing the request.
    */
    REQUEST_REJECTED:1002,

    /** Error related to converting values between V8, CEF, and PS domains.
    The message of the returned error object may contain additional information
    about the failure type.
    */
    CONVERSION_ERROR:1050,

    /** Attempt to execute a native function that was not recognized by the host */
    UNKNOWN_FUNCTION_ERROR:1051,

    /** An error occurred in the "suite pea" layer of Photoshop.
    The message of the returned error object may contain additional information
    about the failure type.
    */
    SUITEPEA_ERROR:1100,

    /** An attempt to dispatch a new message while another message was already
    being dispatched.
    This error indicates a command processing issue in the Photoshop adapter layer.
    */
    REENTRANCY_ERROR:1500,

    /* Deprecated error codes */
    UNKNOWN_USER_CANCELLED:2,
};

/** Notifier groups allow javascript to listen to various events.
Different event scopes are mapped to different notifier groups.
The Spaces runtime uses a single slot model where at most a single
javascript notifier can be installed at any time.
Registering for notifications in a notifier group will cause the runtime
to set up necessary runtime hooks,
For efficiency reasons javascript should only register for the notifier
groups that are needed for the current javascript execution mode as opposed
to registering for all groups and then perform mode filtering in the
javascript layer.
Notifier groups are used with _spaces.setNotifier.
*/
_spaces.notifierGroup = {

    /** Used for notifications from Photoshop.
    The options argument that is provided to _spaces.setNotifier must adhere to the
    following specification:
        "events" (array, required)
            This list specifies which Photoshop events to sign up for.
            The elements in the list can have one of two forms:
            (string)    If the element is a string, then the value describes the Photoshop
                        event to listen to. When using this form only events at playlevel 1
                        (the user interaction level) are returned.
            (object)    If the element is an object, then it must have the following form:
                "event" (string, required) 
                    The Photoshop event to listen to.
                "universal" (boolean, optional, default: false)
                    If universal is specified with a value of true, then all events are returned
                    regardless of the current playlevel when the event is generated.
                    If universal is not specified, or has the value false, then only events
                    at playlevel 1 are returned.
                    An event notifier that is emittedt for universal=true will have
                    a "notifyPlayLevel" key in the info argument (see the callback
                    documentation). This key describes the current playlevel when
                    the notification was generated.
     
    The callback will have the following signature
    callback(err, notificationKind, info).
    - notificationKind is a string describing the Photoshop event.
    - info is an object containing additional information about the event.
     */
    PHOTOSHOP:               "notifierGroupPhotoshop",


    /** Used for notifications from the operating system.
    The callback will have the following signature
    callback(err, notificationKind, info)
    - notificationKind is a string describing the OS event.
    - info is an object containing additional information about the event.

    NOTE: Also use _spaces.os.setExternalEventNotificationMode() to
    selectively enable mouse event notifications for a notifier callback.
    (Since mouse event notification of all types are disabled by default)
    */
    OS:                     "notifierGroupOS",

    /** Used for menu selection notifications for javascript driven menus.
    @see installMenu

    The callback will have the following signature
    callback(err, menuCommand, info)
    - menuCommand corresponds to the menu command string that was used when creating the menu.
    - info is currently unused
     */
    MENU:                   "notifierGroupMenu",

    /** Used for notifications related to interaction state changes in
    Photoshop.
    An example of interaction state changes is: show/hide of progress dialogs.
    This group allows for *redirection* of certain interactions and this means that
    this group may change the behavior of Photoshop.
    When calling setNotifier for registering for INTERACTION_STATE, the options
    argument must specify the interaction state changes that are desired. This
    is done by including the key "notificationKind" key whose value one or more
    of the bit-field values described in _spaces.notifierOptions.interaction.
     
    The callback will have the signature:
    callback(err, type, info)
    @see _spaces.notifierGroupOptions for a explanation of type and info for
    each of the various notification types.
    */
    INTERACTION:            "notifierGroupInteraction",
    
    /** This group is used to sign up for (experimental) touch events.
    If a browser requests touch events (on Windows), then these events are not
    propagated to the default handler and this means that Windows will not synthesize
    mouse events.
    */
    TOUCH:                  "notifierGroupTouch",

    /** This group is used when receiving messages from a direct handler inside
    Photoshop.
    */
    DIRECT:                  "notifierGroupDirect"
};

if (!_spaces.notifierOptions)
    _spaces.notifierOptions = {}

/** Options for _spaces.notifierGroup.INTERACTION
*/
_spaces.notifierOptions.interaction = {
    /** Used to request progress notifications from Photoshop.
    This option will suppress default progress UI,
    A progress notification has a type argument whose value is "progress".
    The info argument is an object with three keys:
        "title" whose value is the title of the progress dialog that would have been displayed
        "phase" whose value is one of "start", "update", and "finish"
        "completion" whose value is the percentage of the task that is completed, in the range 0-100
    */
    PROGRESS: 1,

    /** Used to request notifications for error messages from Photoshop.
    This option will suppress default error UI from being displayed.
    An error notification has a type argument whose value is "error".
    The info argument is an object with the key "text" whose value is the text the dialog would have displayed.
    */
    ERROR: 2,

    /** Used to request notifications for "options" dialogs from Photoshop
    Options dialogs are presented modally by certain tools when more information
    may be provided.  An example is the "Create Rectangle" options dialog that is
    presented when a user single-clicks on the document view when the Rectangle tool
    is active.  
    This option will prevent certain options dialogs from being displayed.
    An options notification has a type argument whose value is "options".
    The info argument is an object with the key "message" whose value is the title or message the dialog would have displayed.
    */
    OPTIONS: 4,

    /** Used to request notifications for context menus in Photoshop.
    An options notification has a type argument whose value is "options".
    The info argument is an object with the key "location".  The value of the "location" argument is an object with two
    keys, "x", and "y" representing the screen location within the document view window where the context menu was invoked.
    */
    CONTEXT: 8,

    /** Used to request notifications for user interactions such as the user resizing the application frame.
    When the application frame is resized, then two notifications are received:
    - "interactiveResizeBegin" when the resize interaction begins
    - "interactiveResizeEnd" when the resize interaction ends.
    */
    USER: 16,
};

/** Set a notifier callback for the provided notifier group.
@see _spaces.notifierGroup.

@param notifierGroup (string)   The target notifier group.
@param options (object)         Options specific to the notifier group. See the notifier group description.
@param  callback (function)
    The function to invoke when a notifier is received.
    Use undefined to unsubscribe from the specified notifierGroup.
    If the requested notification can be created, then the
    callback is invoked with a single err argument whose value
    follows the standard err rules. see the general objects
    section.
*/
_spaces.setNotifier = function (notifierGroup, options, callback) {
    native function pgSetNotifier();
    return pgSetNotifier(notifierGroup, options, callback);
};

/** Send a notification to a particular notifier group.
@param notifierGroup (string)   The group that the notification should be sent to.
                                Typically this is a custom group that some other JavaScript
                                instance has registered a listener for.
@param notification (string)    The notification name.
@param notificationInfo (object) Additional data related to the notification. If no data is
                                appropriate for the notification, then an empty object should
                                be passed in. You cannot use undefined, or null.
@param options                  Options pertaining to sending the notification.
                                "mayEnqueue" (bool, optional)
                                    If present and if the value is true, then the notification
                                    may be enqueued if the target is in the process of initializing.
@param callback                 Result notifier.

*/
_spaces.sendNotification = function (notifierGroup, notification, notificationInfo, options, callback) {
    native function pgSendNotification();
    return pgSendNotification(notifierGroup, notification, notificationInfo, options, callback);
};

/** Properties.
@see getPropertyValue and setPropertyValue
Properties:

Tooltip properties:
"ui.tooltip.delay.coldToHot"
    Value is a number describing the delay to use in in seconds. The value must
    be > 0.
    The initial delay used before showing a tooltip.

"ui.tooltip.delay.hotToHot"
    Value is a number describing the delay to use in in seconds. The value must
    be > 0.
    The delay used when changing an existing tooltip.

"ui.tooltip.delay.hotToCold"
    Value is a number describing the delay to use in in seconds. The value must
    be > 0.
    Delay used when dismissing a tooltip.

"ui.tooltip.delay.autoHide"
    Value is a number describing the delay to use in in seconds. If the value is
    <= 0, then auto-hiding is disabled.
    Delay used to determine when a visible tooltip should be hidden.

"ui.alignment"
    Specifies how UI should be aligned relative to a mouse location.
    The value is typically used on direct touch displays to inform HTML about the handedness
    of the user. If the user is right handed, then UI should be displayed to the left of
    the mouse location (when the user is right handed, then this property return "left" alignment).
    Value can be "left" or "right".
    This value is read-only.
*/

/** Get the value of a property.
@param propertyName (string)    Specifies the property whose value to return.
@param options      (object)    Specifies options for the operation. Currently
                                unused.
@param callback     (function)  A callback notifier with the signature described below.

callback(err, propertyValue)
"propertyValue" (<multiple>)    The value of the property. The type of the value depends
                                on the property.
*/
_spaces.getPropertyValue = function (propertyName, options, callback) {
    native function pgGetPropertyValue();
    return pgGetPropertyValue(propertyName, options, callback);
};

/** Set the value of a property.
@param propertyName  (string)     Specifies the property whose value to set.
@param propertyValue (<multiple>) Specifies the new value of the property. The
                                  type of the value depends on the property.
@param options       (object)     Specifies options for the operation. Currently
                                  unused.
@param callback     (function)    A callback notifier with an err argument.
*/
_spaces.setPropertyValue = function (propertyName, propertyValue, options, callback) {
    native function pgSetPropertyValue();
    return pgSetPropertyValue(propertyName, propertyValue, options, callback);
};


/** Abort the current Spaces interaction.
This API is intended to be used when the HTML session detects an unrecoverable
error. In that case calling "abort" will return the user to the default experience.
By default the Cef session will be destroyed when "abort" is called. See lifetime
discussion below.
An optional dialog can be shown in the host environment after the HTML surface
has been hidden.

Lifetime:
By default the Cef session will be destroyed when "abort" is called. This can be a
problem while developing the HTML application, as you then loose the ability to
introspect the Cef state after "abort" has been called.
To keep the Cef session alive after the call to "abort", you can set the following key to
true in the "Settings.json" configuration file: "dont_destroy_cef_in_abort".
If "dont_destroy_cef_in_abort" is specified, then the Cef session is kept alive after
"abort" is called and you can introspect the Cef state with the Chromium debugger.
After the state has been analyzed, you will need to call "abort" again with forceDestroy
set to true in order to put Spaces into a state that allows for a relaunch of the HTML
experience without a restart of Photoshop.

@param  options      (object)   Specifies options for the operation.
@param  callback     (function) A callback notifier that may be executed in certain
                                cases (see below). If the command is successful then
                                the callback is *not* executed.

"options"
The following keys are recognized:
"message" (string,optional)
    If provided then an alert is shown in the host environment after the HTML surface
    has been hidden. The text of the alert is the contents of message.
"forceDestroy" (boolean,optional)
    Default value is "false". If true, then the Cef session is destroyed regardless of
    the contents of Sessings.json. This parameter is meant to be used only from an
    interactive Chromium debugger console (after the aborted session has been analyzed).

callback(err)
The callback notifier is typically not executed because abort terminates
the HTML session.
If an error occurs while processing abort, or if the host is unable to abort
the current session, then an error is returned.
*/
_spaces.abort = function (options, callback) {
    native function pgAbort();
    return pgAbort(options, callback);
};

/** open a URL in the default browser 
@param url          (string)    A URL.
@param callback     (function)  Callback error notifier with an "err" argument.
*/
_spaces.openURLInDefaultBrowser = function (url, callback) {
    native function pgOpenURLInDefaultBrowser();
    return pgOpenURLInDefaultBrowser(url, callback);
};


// ==========================================================================
// _spaces.ps  -  Functionality related to Photoshop

if (!_spaces.ps)
   _spaces.ps = {};

/** Return the tool that is currently selected
@param  callback     (function) A callback notifier with the signature described below.


callback(err, info)
"info" (object)
    Object describing the current state. The following keys
    are provided in the info object:
    "title"     (string)    Title of the current tool
    "isModal"   (boolean)   True if the tool is modal
    "key"       (string)    OSType for the tool
*/
_spaces.ps.getActiveTool = function (callback) {
    native function psGetActiveTool();
    return psGetActiveTool(callback);
};

/** end the current modal tool editing state. If Photoshop is not currently
in a modal tool editing state, then this method does nothing.
@param doCommit     (boolean)   If true then the current edit will be committed.
                                If false, then the current edit will be canceled.
@param  callback    (function)  A callback notifier with an err argument.
*/
_spaces.ps.endModalToolState = function (doCommit, callback) {
    native function psEndModalToolState();
    return psEndModalToolState(doCommit, callback);
};

/** Get the state of a menu command.
@param options (object)
    Options describing the request. See below for details.
@param  callback (function)
    A callback notifier with the signature described below.

options
"commandId" (number)
    The identifier of the menu command to query

callback(err, available)
@param available (boolean)
    If the menu command was available then this argument is true.
*/
_spaces.ps.getMenuCommandState = function (options, callback) {
    native function psGetMenuCommandState();
    return psGetMenuCommandState(options, callback);
    };

/** Perform a Photoshop menu command
@param options (object)
    Options describing the request. See below for details.
@param  callback (function)
    A callback notifier with the signature described below.

options
"commandId" (number)
    The identifier of the menu command to perform.
"waitForCompletion" (boolean, optional)
    If true, then Photoshop waits for the command to complete before invoking
    the callback notifier. The default value is false.

callback(err, available)
@param available (boolean)
    If the menu command was available then this argument is true and the
    command was performed. If the command was not available then this
    argument will be false and the command was not performed.
*/
_spaces.ps.performMenuCommand = function (options, callback) {
    native function psPerformMenuCommand();
    return psPerformMenuCommand(options, callback);
    };

/** Get the menu title for a Photoshop menu command
@param options (object)
    Options describing the request. See below for details.
@param  callback (function)
    A callback notifier with the signature described below.

options
"commandId" (number)
    The identifier of the menu command
"menuId" (number)
    The identifier of the menu item, use one or the other

callback(err, available)
@param title (string)
    If the menu command was found, the localized title is returned.
*/
_spaces.ps.getMenuCommandTitle = function (options, callback) {
    native function psGetMenuCommandTitle();
    return psGetMenuCommandTitle(options, callback);
    };

/** Process all commands that are in the internal Photoshop command queue.
This API can be used to ensure that certain operations have completed.
In some cases performing a Photoshop command (via batchPlay or performMenuCommand)
may result in Photoshop queuing a command for execution a a later time.
Also, some commands post additional commands when they are executed.
Calling this API will cause Photoshop to process all pending commands in the
event queue.
@param  options      (object)   Specifies options for the operation.
@param callback (function)  A callback notifier with an err argument.


"options"
The following keys are recognized:
"invalidateMenus" (boolean, optional)
    If true then Photoshop's menus are invalidated after the operation. This can be
    useful when the pending commands may affect which menu commands that are enabled.
    If a call to performMenuCommand returns "false" for "available" then the issue
    could be that the related command is disabled due to a stale menu state. In this case
    calling this api to invalidate menus may resolve the issue.
    @See performMenuCommand.
*/
_spaces.ps.processQueuedCommands = function (options, callback) {
    native function psProcessQueuedCommands();
    return psProcessQueuedCommands(options, callback);
};

/** Request a document preview from Photoshop.
@param options (object)
    An object specifying the requested image. The following keys are recognized:
    "documentId" (number, required)
        The ID of the target document related to the image.
        If the ID is less than 0, then the current document is used.
    "encoding" (string, required)
        The requested encoding. Currently only "base64" is supported.
    "format" (string, required)
        The requested image format. Currently "jpg" and "png" are supported.
    "size" (object, required)
        "width"     preferred width in pixels of the image. Must be greater than 0.
        "heigt"     preferred height in pixels of the image. Must be greater than 0.
    "embedProfile" (boolean, optional)
        If true, then a color profile (if it exists) is embedded into the returned image.
        Default value is false.
    "scaling" (string)
        Specifies how the image shoud be scaled relative to its actual bounds.
        "none"  means no scaling should occur and the returned image should have the same
                bounsd as requested
        "proportionalDown" Scales the image down proportionally to fix inside the requested
                bounds

@param  callback     (function) a callback notifier with the signature described below.


callback(err, info)
    "image"  (string)
        a base64 encoded representation of the image
    "format"  (string)
        format of the returned image
    "size" (object)
        "width"     actual width in pixels of the returned image
        "heigt"     actual height in pixels of the returned image
*/
_spaces.ps.createDocumentPreview = function (options, callback) {
    native function psCreateDocumentPreview();
    return psCreateDocumentPreview(options, callback);
    };

/** Logs an event to the Photoshop Headlights database.
Note: do not dynamically generate event names, rather use a small number of unique names.

@param options (object)
    An object with the following keys:
    "category" (string)     The Headlights category,
    "subcategory" (string)  The Headlights subcategory
    "event" (string)        The Headlights event
@param callback (function)  A callback notifier with an err argument.
*/
_spaces.ps.logHeadlightsEvent = function (options, callback) {
    native function psLogHeadlightsEvent();
    return psLogHeadlightsEvent(options, callback);
};

/** Logs a data group to the Photoshop Headlights database.
    Category will be "Scripting", and sub category will be defined by "eventRecord"
        in the passed in object, rest of the key values in the descriptor 
        are used for data group
Note: Do not dynamically generate values for fields, use a small set of possible values

@param datagroup (object)
    An object with any number of key/value string pairs, one of them being
    "eventRecord" (string)  The Headlights event name for this data group to be collected under
@param options (object)
    Options controlling the execution of the request (currently unused)
@param callback (function)  A callback notifier with an err argument.
*/
_spaces.ps.logHeadlightsDataGroup = function (datagroup, options, callback) {
    native function psLogHeadlightsDataGroup();
    return psLogHeadlightsDataGroup(datagroup, options, callback);
};

/** Read preferences for the browser.
*/
_spaces.ps.readPreferences = function (options, callback) {
    native function psReadPreferences();
    return psReadPreferences(options, callback);
};

_spaces.ps.writePreferences = function (value, options, callback) {
    native function psWritePreferences();
    return psWritePreferences(value, options, callback);
};

// ==========================================================================
// _spaces.ps.descriptor  -  Functionality related to executing
//                               Action Descriptors

if (!_spaces.ps.descriptor)
    _spaces.ps.descriptor = {};

/** Options used to control how action descriptors are executed
*/
_spaces.ps.descriptor.interactionMode = {
    /*
    Display dialog only if necessary due to missing parameters or error.
    */
    DONT_DISPLAY: 1,

    /*
    Present the plug-in dialog using descriptor information.
    */
    DISPLAY: 2,

    /*
    Never present a dialog; use only descriptor information;
    if the information is insufficient to run the command,
    an error is returned in the callback method.
    */
    SILENT: 3 
};

/** Common descriptor options
"canExecuteWhileModal" (optional, boolean).
The value determines whether or not the request can be accepted when the host is in a modal state.
The default value is false, which means that a request is rejected if the host is in a
modal state.

"useExtendedReference" (optional, boolean)
Used when an extended action reference is provided to a get, play, or batchPlay command.
*/

/** Play a list of commands
@param commands (list)
    A list of commands to play. A command is an object conforming to the following
    specification:
    "name" (string)         The Photoshop command to play.
    "descriptor" (object)   Arguments for the Photoshop command
    "options" (object)      Options for the command. The following keys are accepted:
                            "useExtendedReference" (optional, boolean). @see common descriptor options
                            "useMultiGet" (optional, boolean). If true, then the command is an "get"
                                command that contains a multiGet reference. The multiGet reference must
                                be provided on a "null" key in the descriptor object.
@param options (object)
    Options controlling the batch process. The following keys are accepted:
    "canExecuteWhileModal" (optional, boolean).
        @see the general objects section.
    "continueOnError" (boolean, optional)
        If true, then all commands are executed regardless of the return value of
        the individual commands. If false, then the command terminates if any of
        the individual commands return an error. The default value is false.
    "historyStateInfo" (object, optional).
        If present, then all commands are combined into a single history state.
        The requirement for having a single history state is that all commands target
        the same document. The following keys are accepted:
           "name"       (string)            the name to use for the history state
           "target"     (action reference)  action reference specifying the target document
           "coalesce"   (boolean, optional)
                Replace existing saved undo history state if it has the same name.
                Default value is false.
           "suppressHistoryStateNotification" (bool) If true then the history state notification
                        associated with the "revert step" in coalescing is suppressed
    "ignoreTargetWhenModal" (optional, boolean)
        when set to true, then any target reference in the provided descriptor is ignored
        if the host is in a modal dialog state, or in a modal tool state. This allows the
        request to be dispatched via the modal handler chain
    "interactionMode" (optional)
        A value from _spaces.ps.descriptor.interactionMode.<some value>
        The default value is SILENT
    "isUserInteractionCommand" (optional, boolean)
        When set to true, then the command is treated as part of a tight user interaction/tracking
        loop.
        When this is the case, idle tasks are postponed.
        Care should be taken to not mark all commands as user interaction commands as that
        will prevent necessary idle tasks from completing.
        Default value is false.
    "paintOptions" (object, optional).
        Controls how the Photoshop canvas is updated after all commands have been executed.
        @see the general objects section.
    "synchronous" (optional, boolean)
        Default value is true.
        This option determines whethger or not the command is executed synchronously by the
        Photoshop API, or asynchronously via the Photoshop command queue. In the synchronous
        case the API layer waits for Photoshop to complete the command, and while in this state
        UI is not updated, and it is not possible to execute other commands.
        In the asynchronous case, the commands is handed off to Photoshop for execution at a later
        time, and while waiting for the result other commands can be executed and the UI is
        live.
        The asynchronous execution mode does not support the following features:
            - continueOnError. The asynchronous mode will attempt to execute all commands regardless of
                the result of the individual commands.
            - historyStateInfo is not supported in the asynchronous mode.
            - paintOptions is not supported in the asynchronous mode.
            - ignoreTargetWhenModal is not supported in the asynchronous mode.
            - multi-get references are not supported in the asynchronous mode.
            - extended references are not supported in the asynchronous mode.
 
@param callback (function) A callback notifier with the signature described below.

callback(err, descriptors, errors)
@param descriptors Array of result descriptor from the play commands.
@param errors      Array of error values corresponding to the
                   results en the descriptors array. If no error
                   was returned from the Nth command, then the
                   corresponding error value is undefined.
*/
_spaces.ps.descriptor.batchPlay = function (commands, options, callback) {
    native function psDescBatchPlay();
    return psDescBatchPlay(commands, options, callback);
};

/** execute a "get" action descriptor request.
"get" can be used to obtain multiple values in a single call. This is done by
using the "_multiGetRef" variation of the provided reference.

@param reference (object)
A javascript object describing the action reference target for the request.
@param options (object)
options for the getter. @see common descriptor options.
When a "_multiGetRef" is provided in the reference, then the following keys are also
recognized:
    "failOnMissingProperty" (bool, optional)  If true, then the multi-get operation fails
        if any of the target elements do not have a requested property.
        Default value is true.
    "failOnMissingElement" (bool, optional)  If true, then the multi-get operation fails
        if any of the requested target-range elements do not exist.
        Default value is true.
@param  callback     (function) A callback notifier with the signature described below.


callback(err, descriptor)
@param descriptor      if the method succeeds, then this argument
                      contains the result descriptor as returned by
                      Photoshop's get implementation
*/
_spaces.ps.descriptor.get = function (reference, options, callback) {
    native function psDescGet();
    
    return psDescGet(reference, options, callback);
};

/** Send a message to a designated handler inside Photoshop
@param name (string)
    The message name
@param descriptor (object)
    Message arguments. Must be an action descriptor object.
@param options (object)
    Options. The following key is recognized:
        "canExecuteWhileModal" (boolean, optional, default: true).
        See Common descriptor options, *but* notice that for sendDirectMessage,
        the default value is true.
 
@param  callback (function)
A callback notifier with the signature described below.


callback(err, descriptor)
@param descriptor     if the method succeeds, then this argument
                      contains the result descriptor as returned by the message
                      handler
*/
_spaces.ps.descriptor.sendDirectMessage = function (name, arguments, options, callback) {
    native function psDescMessage();
    
    return psDescMessage(name, arguments, options, callback);
};


// ==========================================================================
// _spaces.ps.ui

if (!_spaces.ps.ui)
    _spaces.ps.ui = {};

/** Returns the scale factor that photoshop is using for its user interface elements.
*/
Object.defineProperty(_spaces.ps.ui, "scaleFactor", {
    writeable: false,
    enumerable: true,
    configurable: false,
    get: function () {
        native function psUiGetScaleFactorProp();
        return psUiGetScaleFactorProp();
    }
});

/// "bit field" enumeration describing the various UI types
_spaces.ps.ui.widgetTypes = {
    TOOLBAR: 1,
    CONTROLBAR: 2,
    PALETTE: 4,
    DOCUMENT: 8,
    APPLICATIONBAR: 16,
    DOCUMENT_TABS: 32,
    ALL: 63   // be sure to update when adding any items
};

/** Show/Hide UI types.
@param widgetTypes (number)     The UI types whose visibility should be affected.
                                @see _spaces.ui.widgetTypes
@param visibility (boolean)     Whether or not the provided widget types should be shown
                                or hidden
@param callback (function)      A callback notifier with an err argument.
*/
_spaces.ps.ui.setWidgetTypeVisibility = function (widgetTypes, visibility, callback) {
    native function psUiSetWidgetTypeVisibility();
    return psUiSetWidgetTypeVisibility(widgetTypes, visibility, callback);
};

/** Display a temporal identify appearance.
@param target (object)          An object specifying what to identify
                                If the target contains globalBounds, then the
                                area specified by these bounds is identified.
@param options (object)         Currently unused
@param callback (function)      A callback notifier with an err argument.
*/
_spaces.ps.ui.performIdentify = function (target, options, callback) {
    native function psUiPerformIdentify();
    return psUiPerformIdentify(target, options, callback);
};

    /// enumeration controlling the pointer propagation mode
_spaces.ps.ui.pointerPropagationMode = {

    /** Propagate the pointer event based on the alpha value at the event point.
    If alpha is 0, then the event is sent to Photoshop.
    If alpha is not 0, then the event is sent to the browser.
    */
    PROPAGATE_BY_ALPHA: 0,

    /** Always send the pointer event to Photoshop
    */
    PROPAGATE_TO_PHOTOSHOP: 1,

    /** Always send the pointer event to the browser.
    */
    PROPAGATE_TO_BROWSER: 2,

	/** Propagate the pointer event based on the alpha value under the event point
    similar to PROPAGATE_BY_ALPHA.
    If a mouse move event is sent to Photoshop, then the browser is notified
    via a EXTERNAL_MOUSE_MOVE message.
    */
    PROPAGATE_BY_ALPHA_AND_NOTIFY: 3,


    // @{ legacy definitions - start
	ALPHA_PROPAGATE: 0,
    ALWAYS_PROPAGATE: 1,
    NEVER_PROPAGATE: 2,
    ALPHA_PROPAGATE_WITH_NOTIFY: 3
    // @} legacy definitions - end
};

/// enumeration controlling the keyboard propagation mode
_spaces.ps.ui.keyboardPropagationMode = {

    /** The keyboard event propagation is based on the current
    OS keyboard focus.
    The browser will receive the event if the browser has keyboard focus.
    */
    PROPAGATE_BY_FOCUS: 0,

    /** Always send the keyboard event to Photoshop
    */
    PROPAGATE_TO_PHOTOSHOP: 1,

    /** Always send the keyboard event to the browser.
    */
    PROPAGATE_TO_BROWSER: 2,

    // @{ legacy definitions - start
	FOCUS_PROPAGATE: 0,
    ALWAYS_PROPAGATE: 1,
    NEVER_PROPAGATE: 2,
    // @} legacy definitions - end
};

/** Change the pointer propagation mode.
This mode is used if there is no pointer policies that match the current mouse
event.
@param mode (object)
    The propagation mode that Spaces should use in its OS views.
    The following keys are recognized:
    "defaultMode" (number, optional)
        A value from _spaces.ps.ui.pointerPropagationMode
        The default value is ALPHA_PROPAGATE
@param callback (function)      A callback notifier with an err argument.
*/
_spaces.ps.ui.setPointerPropagationMode = function (mode, callback) {
    native function psUiSetPointerPropagationMode();
    return psUiSetPointerPropagationMode(mode, callback);
};

/** Get the pointer propagation mode
@param callback (function)
    Callback notifier with the following signature: callback(err, mode)
    "mode" (number)     A value from _spaces.ps.ui.pointerPropagationMode
*/
_spaces.ps.ui.getPointerPropagationMode = function (callback) {
    native function psUiGetPointerPropagationMode();
        return psUiGetPointerPropagationMode(callback);
    };

/// enumeration controlling the action for an event policy entry
_spaces.ps.ui.policyAction = {

    /** Specifies that a pointer policy action uses alpha propagation.
    @see pointerPropagationMode.PROPAGATE_BY_ALPHA
    */
    PROPAGATE_BY_ALPHA: 0,

    /** Specifies that a keyboard policy action uses focus propagation.
    @see keyboardPropagationMode.PROPAGATE_BY_FOCUS
    */
    PROPAGATE_BY_FOCUS: 0,

    /** Always send the event to Photoshop
    */
    PROPAGATE_TO_PHOTOSHOP: 1,

    /** Always send the event to the browser.
    */
    PROPAGATE_TO_BROWSER: 2,

    // @{ legacy definitions - start
	DEFAULT_PROPAGATE: 0,
    ALWAYS_PROPAGATE: 1,
    NEVER_PROPAGATE: 2,
    ALPHA_PROPAGATE: 0,
    FOCUS_PROPAGATE: 0,
    // @} legacy definitions - end
};

/** Change the pointer propagation policy
@param options (list)
    The propagation policy that Spaces should use for OS pointer events.
    The list may have 0 or more policies.
    A policy is an object whose form depends on the type of event. At the moment
    only pointer events are supported.
    A pointer event policy is an object with the following keys:
    "eventKind" (number, required)
        Can be _spaces.os.eventKind.LEFT_MOUSE_DOWN or MOUSE_WHEEL or RIGHT_MOUSE_DOWN,
    "modifiers" (number)    _spaces.os.eventModifiers,
    "area" (list, optional). Area relative to the Spaces surface that the policy covers.
                            The list is interpreted as: [x, y, width, height]
    "action"                _spaces.ps.ui.policyAction}
    "eventKind", "modifiers", and "area" are filter values that are used to identify
    events that the policy affects. "action" specifies how target events should
    be propagated.
@param  callback    (function)  A callback notifier with an err argument.
*/
_spaces.ps.ui.setPointerEventPropagationPolicy = function (options, callback) {
    native function psUiSetPointerEventPropagationPolicy();
    return psUiSetPointerEventPropagationPolicy(options, callback);
};

/** Change the keyboard propagation mode.
This mode is used if there is no keyboard policies that match a given keyboard event
event.
@param mode (object)
    The propagation mode that Spaces should use in its OS views.
    The following keys are recognized:
    "defaultMode" (number, optional)
        A value from _spaces.ps.ui.keyboardPropagationMode
        The default value is FOCUS_PROPAGATE
@param  callback    (function)  A callback notifier with an err argument.
*/
_spaces.ps.ui.setKeyboardPropagationMode = function (mode, callback) {
    native function psUiSetKeyboardPropagationMode();
    return psUiSetKeyboardPropagationMode(mode, callback);
};

/** Get the keyboard propagation mode
@param callback (function)
    Callback notifier with the following signature: callback(err, mode)
    "mode" (number)     A value from _spaces.ps.ui.keyboardPropagationMode
*/
_spaces.ps.ui.getKeyboardPropagationMode = function (callback) {
    native function psUiGetKeyboardPropagationMode();
        return psUiGetKeyboardPropagationMode(callback);
    };

/** Change the keyboard propagation policy
@param options (list)
    The propagation policy that Spaces should use for OS keyboard events.
    The list may have 0 or more policies.
    A policy is an object whose form depends on the type of event.
    A keyboard policy is an object with the following keys:
    "eventKind" (number, required)
        Can be _spaces.os.eventKind.KEY_DOWN or KEY_UP,
    "modifiers" (number, optional)  _spaces.os.eventModifiers,
    "keyCode" (string)              _spaces.os.keyCode
    "keyChar" (string)              a "UTF8 char"
    "action" (number, required)     _spaces.ps.ui.policyAction
    If "keyChar" is specified, then "keyCode" is ignored. Either "keyChar" or "keyCode"
    must be specified.
    "eventKind", "modifiers", and "keyCode"/"keyChar" are filter values that are used
    to identify events that the policy affects. action specifies how target events
    should be propagated.
    The upper/lower casing of a keyChar UTF8 specifier is not-significant,
    as all UTF8 matching is performed using case-insensitive and system-locale-specific
    comparisons. Use the modifier argument to match against a specific uppercase/
    lowercase keyChar UTF8 specifier.
@param  callback    (function)  A callback notifier with an err argument.
*/
_spaces.ps.ui.setKeyboardEventPropagationPolicy = function (options, callback) {
    native function psUiSetKeyboardEventPropagationPolicy();
    return psUiSetKeyboardEventPropagationPolicy(options, callback);
};

/// enumeration controlling over-scroll mode
_spaces.ps.ui.overscrollMode = {
    /// Normal over-scroll mode, over-scroll is active when content intersects view edge.
    NORMAL_OVERSCROLL: 0,

    /// Force Photoshop to always be in over-scroll mode.
    ALWAYS_OVERSCROLL: 1,

    /// Never allow Photoshop to enter over-scroll mode.
    NEVER_OVERSCROLL: 2,
};

/** Change the over-scroll mode
@param mode (object)    The over-scroll mode that Photoshop should use in its
                        document views.
                        The argument must be an object with the following key
                          { "mode": _spaces.ps.ui.overscrollMode}
                      @see _spaces.ps.ui.overscrollMode
@param callback     (function)    A callback notifier with an err argument.
*/
_spaces.ps.ui.setOverscrollMode = function (mode, callback) {
    native function psUiSetOverscrollMode();
    return psUiSetOverscrollMode(mode, callback);
};

/** Get the over-scroll mode
@param callback     (function)  A callback notifier with the signature described below.


callback(err, mode)
@param mode (number)    the over-scroll mode. @see _spaces.ps.ui.overscrollMode
*/
_spaces.ps.ui.getOverscrollMode = function (callback) {
    native function psUiGetOverscrollMode();
    return psUiGetOverscrollMode(callback);
};

/** Set whether or not scrollbars are suppressed.
When suppressed, scrollbars never show.
When not suppressed then scrollbars follow default rules meaning that they show
in normal screen mode, but are hidden in fullscreen mode.
@param value          true if scrollbars should be suppressed
@param callback       Callback notifier with the following signature:
                        notifier(err, previousValue)
*/
_spaces.ps.ui.setSuppressScrollbars = function (value, callback) {
    native function psUiSetSuppressScrollbars();
    return psUiSetSuppressScrollbars(value, callback);
};

/** Return whether or not scrollbars are suppressed
@param callback     (function)  A callback notifier with the signature described below.

callback(err, value)
@param value (boolean)  true if scrollbars are currently suppressed.
                        false otherwise.
*/
_spaces.ps.ui.getSuppressScrollbars = function (callback) {
    native function psUiGetSuppressScrollbars();
    return psUiGetSuppressScrollbars(callback);
};

/** Set whether or not target-paths are suppressed.
@param value (boolean)  true if target-paths should be suppressed
@param callback         Callback notifier with the following signature:
                          notifier(err, previousValue)
*/
_spaces.ps.ui.setSuppressTargetPaths = function (value, callback) {
    native function psUiSetSuppressTargetPaths();
    return psUiSetSuppressTargetPaths(value, callback);
};

/** Return whether or not target-paths are suppressed
@param callback     (function)  A callback notifier with the signature described below.

callback(err, value)
@param value (boolean)  true if target-paths are currently suppressed.
                        false otherwise.
*/
_spaces.ps.ui.getSuppressTargetPaths = function (callback) {
    native function psUiGetSuppressTargetPaths();
    return psUiGetSuppressTargetPaths(callback);
};

/** The overlay offset describes how much space on each side that should be
considered opaque with respect to the document.
This value is for example used when centering documents.
Example:
The area used by Spaces (typically the document area) is 200 by 200.
We show UI on the right hand size which is 50 wide and UI at the top that is 15 tall.
In this case we would set the right component of the overlay to 50, the top component to 15,
and other values to 0.
When a new document is created, then it will be centered inside the rectangle that is
calculated by subtracting the overlay from the total area.
For the example, the document would be centered inside the rectangle (left, top, right, bottom):
    (0, 10, 150, 200)

@param options (object)
    The following keys are recognized:
    "offset": (object)   Describing the size. The following keys are recognized:
                         "left", "top", "right" and "bottom"
@param callback     (function)  A callback notifier with the signature described below.


callback(err, previousValue)
@param previousValue (object)
    The following keys are returned:
    "offset": (object) with keys: "left", "top", "right" and "bottom"
        describing the size of the chrome on the provided sides.
*/
_spaces.ps.ui.setOverlayOffsets = function (options, callback) {
    native function psUiSetOverlayOffsets();
    return psUiSetOverlayOffsets(options, callback);
};

/** Return the current size of the overlay. @See _spaces.ps.ui.setOverlayOffsets
@param callback     (function)  A callback notifier with the signature described below.


callback(err, options)
@param options (object)
    The following keys are returned:
    "offset": (object) with keys: "left", "top", "right" and "bottom"
        describing the size of the chrome on the provided sides.
*/
_spaces.ps.ui.getOverlayOffsets = function (callback) {
    native function psUiGetOverlayOffsets();
    return psUiGetOverlayOffsets(callback);
};


/** Start editing the current text layer
    callback(err)
*/
_spaces.ps.ui.startEditWithCurrentModalTool = function (callback) {
    native function psUiStartEditWithCurrentModalTool();
    return psUiStartEditWithCurrentModalTool(callback);
};


/** Menu bar command "kind"
Identifies a given menu "command" in the menuDescription of
_spaces.ps.ui.installMenu() as having a well-known
system-defined action (e.g: copy/paste) that is applicable
to non-Spaces view systems (like open/save dialogs).
Use this optional attribute to indicate menuitems that
invoke copy/paste functionality which also must interoperate
with copy/paste within system open/save dialogs.
Example usage:

    var menuDescription = { id : "ds", menu : [{
        label: "Edit",
        submenu: [
        {
            label: "MyMenuItem",
            command: "EDIT.MYITEMACTION",
            // User-defined action: No commandKind attribute
            shortcut: { keyChar:"q", modifiers:_spaces.os.eventModifiers.COMMAND }
        },
        {
            label: "Copy",
            command: "EDIT.COPY",
            // Well-known system action: commandKind==copy
            commandKind: _spaces.ps.ui.commandKind.COPY
            shortcut: { keyChar:"c", modifiers:_spaces.os.eventModifiers.COMMAND }
        }]
    }]};
*/
_spaces.ps.ui.commandKind = {
    USER_DEFINED:	0,

    /// command kinds related to text editing
    CUT:            1,
    COPY:           2,
    PASTE:          3,
    SELECT_ALL:     4,
    UNDO:           5,
    REDO:           6,
    DELETE:         7,

    /** command kinds related to application visibility.
    These command kinds are only used on OSX.
    These menu items will auto-enable
    */
    HIDE_APPLICATION:           8,
    HIDE_OTHER_APPLICATIONS:    9,
    HIDE_SHOW_ALL_APPLICATIONS: 10,
};

/** Install a menu bar.
TODO: Add documentation.
*
*/
_spaces.ps.ui.installMenu = function (options, menuDescription, callback) {
    native function psUiInstallMenu();
    return psUiInstallMenu(options, menuDescription, callback);
};

// ==========================================================================
// _spaces.os

if (!_spaces.os)
    _spaces.os = {};

/** _spaces.os.version
Returns information about the version of the host OS that Spaces is running on.
*/
Object.defineProperty(_spaces.os, "version", {
    writeable: false,
    enumerable: true,
    configurable: false,
    get: function () {
        native function pgGetOSVersion();
        return pgGetOSVersion();
    }
});

/** _spaces.os.initialUIBrightness
Returns information about the UI brightness as it was when the browser was created.
This can be used to determine the initial CSS brightness value
*/
Object.defineProperty(_spaces.ps, "initialUIBrightness", {
    writeable: false,
    enumerable: true,
    configurable: false,
    get: function () {
        native function pgGetInitialUIBrightness();
        return pgGetInitialUIBrightness();
    }
});

/** OS eventKinds
*/
_spaces.os.eventKind = {
    LEFT_MOUSE_DOWN:	1,
    KEY_DOWN:			2,
    KEY_UP:				3,
    FLAGS_CHANGED:		4,
    MOUSE_WHEEL:		5,
    MOUSE_MOVE:			6,
    RIGHT_MOUSE_DOWN:	7,
};

/** Modifier bit fields. The command modifier is only used on Mac OS.
When used as a policy filter the modifier bit set must match exactly the
current modifier set.
*/
_spaces.os.eventModifiers = {

    // No modifier key may be pressed
    NONE:       0,
    SHIFT:      1,
    CONTROL:    2,
    ALT:        4,
    COMMAND:    8,
};

/** Keyboard KeyCode values. WIN_LEFT/WIN_RIGHT/WIN_MENU are only used on Windows.
When used as a policy filter the key-code must match exactly.
*/
_spaces.os.eventKeyCode = {
	NONE:		0,

	BACKSPACE:	8,
	TAB:		9,
	ENTER:		13,
	ESCAPE:		27,

	PAGE_UP:	33,
	PAGE_DOWN:	34,
	END:		35,
	HOME:		36,
	ARROW_LEFT:	37,
	ARROW_UP:	38,
	ARROW_RIGHT:39,
	ARROW_DOWN:	40,

	INSERT:		45,
	DELETE:		46,

	WIN_LEFT:	91,
	WIN_RIGHT:	92,
	WIN_MENU:	93,

	KEY_F1:		112,
	KEY_F2:		113,
	KEY_F3:		114,
	KEY_F4:		115,
	KEY_F5:		116,
	KEY_F6:		117,
	KEY_F7:		118,
	KEY_F8:		119,
	KEY_F9:		120,
	KEY_F10:	121,
	KEY_F11:	122,
	KEY_F12:	123,
};

/** OS notifiers
*/
_spaces.os.notifierKind = {

    /** event that is sent if Spaces's mouse capture is unexpectedly interrupted.
    Mouse capture is initiated on mouse down. If someone grabs the mouse capture before
    a corresponding mouse up is delivered, then this event is emitted.
    This event is only sent on Windows
    */
    MOUSE_CAPTURE_LOST: "mouseCaptureLost",

    /** Visibility changed. Sent when the HTML surface visibility is changed
    due to an action in core Photoshop.
    The provided "eventInfo" argument is a dictionary of the following
    form: {"becameVisible": <boolean>}
    visible is true if the host application caused the HTML surface to become visible.
    */
    VISIBILITY_CHANGED: "visibilityChanged",

    /** Activation changed. Sent when the host application is brought to the
    foreground or is sent to the background.
    The provided "eventInfo" argument is a dictionary of the following
    form: {"becameActive": <boolean>}
    becameActive is true if the host application was brought to the foreground
    */
    ACTIVATION_CHANGED: "activationChanged",

    /** KeyboardFocus changed. Sent when the a change to keyboard focus has
	occurred for the CEF surface.
    The provided "eventInfo" argument is a dictionary of the following
    form: {"isActive": <boolean>}
    isActive is true if CEF surface has keyboard focus, false otherwise.
    */
    KEYBOARDFOCUS_CHANGED: "keyboardFocusChanged",

	/** A mousemove event occurred and was not routed to Spaces.
	eventInfo provided is of the form:
	{	eventKind:	_spaces.os.eventKind.MOUSE_MOVE,
		modifiers:	_spaces.os.eventModifiers,
		location:	[x, y] // list[2] of integer(win32) or double(osx) coords
	}
    location is relative to the Spaces surface and its origin is in the
    top left corner.
    */
    EXTERNAL_MOUSE_MOVE: "externalMouseMove",

	/** A mousedown event (left button) occurred and was not routed to Spaces.
    This is typically used to dismiss temporal UI such as popups inside
    the Spaces surface.
	eventInfo provided is of the form:
	{	eventKind:	_spaces.os.eventKind.LEFT_MOUSE_DOWN,
		modifiers:	_spaces.os.eventModifiers,
		clickCount: <int>
		location:	[x, y] // list[2] of integer(win32) or double(osx) coords
        target: dictionary (optional)
        {
            widgetType: "applicationContainer",
            partCode: "windowDragArea"|"menubarArea"|"none",
        }
	}
    location is relative to the Spaces surface and its origin is in the
    top left corner.
    */
    EXTERNAL_MOUSE_DOWN: "externalMouseDown",

	/** A mousedown event (right mouse button) occurred and was not routed to Spaces.
	eventInfo provided is of the form:
	{	eventKind:	_spaces.os.eventKind.RIGHT_MOUSE_DOWN,
		modifiers:	_spaces.os.eventModifiers,
		clickCount: <int>
		location:	[x, y] // list[2] of integer(win32) or double(osx) coords
        target: dictionary (optional)
        {
            widgetType: "applicationContainer",
            partCode: "windowDragArea"|"menubarArea"|"none",
        }
	}
    location is relative to the Spaces surface and its origin is in the
    top left corner.
    */
    EXTERNAL_RMOUSE_DOWN: "externalRMouseDown",

	/** A mousewheel event occurred and was not routed to Spaces.
	eventInfo provided is of the form:
	{	eventKind:	_spaces.os.eventKind.MOUSE_WHEEL,
		modifiers:	_spaces.os.eventModifiers,
		location:	[x, y] // list[2] of integer(win32) or double(osx) coords
	}
    location is relative to the Spaces surface and its origin is in the
    top left corner.
	*/
    EXTERNAL_MOUSE_WHEEL: "externalMouseWheel",

	/** EXTERNAL_KEYEVENT:
    A keyboard event was routed to Spaces via KeyboardPropagationPolicy.
    A keyboard event was intercepted by a ps.ui.policyAction.NEVER_PROPAGATE
    rule in the current KeyboardEventPropagationPolicy and was routed to Spaces.
    NOTE: Notification occurs *BEFORE* delivery of event via javascript onkeydown/up.
    Beware that companion onkeydown/up delivery may not occur due to the underlying
    CEF implementation when: 1) Spaces window does not have focus, or
    2) Spaces window has focus, but HTML focus is not on an editable DOM element.
    In this case, consider workaround using an EventListener("keydown/up") on
    the top level DOM window with the outermost <div tabindex="-1"/>.
    eventInfo provided is a dictionary of the following forms:

        {	eventKind:	_spaces.os.eventKind.KEY_UP|KEY_DOWN,
            modifiers:	_spaces.os.eventModifiers,
            keyCode:	_spaces.os.eventKeyCode }

        {	eventKind:	_spaces.os.eventKind.FLAGS_CHANGED,
            modifiers:	_spaces.os.eventModifiers }
    */
    EXTERNAL_KEYEVENT: "externalKeyEvent",

    /** touch event received on Spaces surface.
    provides a dict with the following key/value pairs:
      "kind":	an int, 0 => direct (tablet), 1 => indirect (trackpad)
      "id":	an int, event sequence number
      "phase":	an int, describes phase of overall event (not that useful, use phase of each touch point instead)
        0: no phase (error state)
        1: begin
        2: move
        3: stay (touch point did not move)
        4: end
        5: cancel (touch was canceled without ending, program state changed, focus change, etc)
      "time":	a double, event time in seconds from some fixed point in the past
      "xScaleFactor" and "yScaleFactor": floats describing the scale from touch points to application space	
      "touches":	a list of touch points, in the following form:
        "touchID":	touch point ID, will not change while user continues to touch digitizer
        "phase":	phase of the individual touch point, values as above.
        "position":	a dict with the following members:
          "x" and "y":	doubles for the touch point location on the screen
    */
    TOUCH: "touch",

    /** ConvertibleSlateMode changed.
    on windows, convertible devices function as a laptop when their keyboard is attached and they are
    in landscape orientation.  upon keyboard detach or orientation change, such devices function as a 
    touch-enabled tablet. Convertible Slate Mode is true when the device is functioning as a tablet.  
    provides a dict with a single key/value pair:
    "convertibleSlateMode":  a boolean, true => tablet mode, false => laptop mode
    */
    CONVERTIBLE_SLATE_MODE_CHANGED: "convertibleSlateModeChanged",
    
    
    /** This notifier is sent when display configuration changes
    */
    DISPLAY_CONFIGURATION_CHANGED: "displayConfigurationChanged",
};

/** Post an OS event to the event queue.
@param eventInfo (object)	Describes the event that should be synthesized
    "eventInfo" has the following form for pointer events:
    {	eventKind:	_spaces.os.eventKind.LEFT_MOUSE_DOWN,
        location:	[x, y]
    }
    The location is relative to the Spaces surface and its origin is in the
    top left corner.

    "eventInfo" has the following form for keyboard events:
    {	eventKind:	_spaces.os.eventKind.KEY_UP|KEY_DOWN,
        modifiers:	_spaces.os.eventModifiers,
        keyCode:	_spaces.os.eventKeyCode,
    }
@param options (object)     currently unused.
@param callback     (function)    A callback notifier with an err argument.
*/
_spaces.os.postEvent = function (eventInfo, options, callback) {
    native function osPostEvent();
    return osPostEvent(eventInfo, options, callback);
};

if (!_spaces.os.clipboard)
    _spaces.os.clipboard = {};

/** Read data from the OS clipboard.
@param options (object)
    The options argument has the following form:
        "formats":  format_specifier_list
    The order of the format list is significant. In the case where multiple formats
    match the contents of the clipboard, the first format listed will be used.
    Spaces operates with two types of formats:
    - built-in formats. These formats map to well defined OS formats. The following
        lists the built in formats:
        "string"    This format can be used to read and write unicode string data.
                    The data for the values of type string is "string".
    - custom formats. Any format that is not a built-in format is considered a custom format.
        The custom format can have any identifier. On OSX Apple recommends a UTI syntax such
        as the following for custom formats: "com.mycompany.myapp.myspecialfiletype".
        See the following URL for information about custom types on OSX:
        https://developer.apple.com/library/ios/documentation/FileManagement/Conceptual/understanding_utis/understand_utis_conc/understand_utis_conc.html#//apple_ref/doc/uid/TP40001319-CH202-CHDHIJDE
@param callback     (function)  A callback notifier with the signature described below.


callback(err, info)
Info contains the following keys:
    "format":   actual_format
    "data":     clipboard data
If the clipboard does not have the requested format, an error will be returned in err.
Otherwise err will be undefined or 0
*/
_spaces.os.clipboard.read = function (options, callback) {
    native function osClipboardRead();
    return osClipboardRead(options, callback);
};

/** Replace the contents of the OS clipboard with the provided data.
@param options (object)
    The options argument has the following form:
        "format":   format_specifier
        "data":     clipboard data
    See "_spaces.os.clipboard.read" for a description of formats.
@param callback     (function)    A callback notifier with an err argument.
*/
_spaces.os.clipboard.write = function (options, callback) {
    native function osClipboardWrite();
    return osClipboardWrite(options, callback);
};

/** Set the tooltip for the host application.
In general tooltips are managed via normal HTML properties.
This API is provided for the rare case that javascript needs to be able to
control tooltip directly via script.
Note: This API is a no-op if the host application is not the frontmost application.

@param options (object)
    Argument specifying the tooltip to set. The following keys are recognized:
    "label" (optional, string)  the tooltip string to use. If this key is omitted,
                                or if the string is empty, then the tooltip is
                                hidden
@param callback     (function)    A callback notifier with an err argument.
*/
_spaces.os.setTooltip = function (options, callback) {
    native function osSetTooltip();
    return osSetTooltip(options, callback);
};

/** Reset the cursor.
This method will cause the OS cursor to be updated.
This method is typically only needed when control over the cursor changes as a
result of changing mouse policy, or as a result of a change to the modal state.
@param options      (currently unused)
@param callback     (function)    A callback notifier with an err argument.
*/
_spaces.os.resetCursor = function (options, callback) {
    native function osResetCursor();
    return osResetCursor(options, callback);
};

/** Obtain the current mouse location the native global coordinate system.
This method is un-synchronized with the main event queue. Instead the most
recent hardware information is returned.
@param options      (currently unused)
*/
_spaces.os.getMouseLocation = function (options) {
    native function osGetMouseLocation();
    return osGetMouseLocation(options);
};

/** Obtain a "temporary" filename.
This method will obtain a temporary unique filename from the underlying OS,
suitable for storing user-specific data. This file is not guaranteed to persist
across Spaces runtime sessions.
@param options (object)
    Argument specifying the seed name to use for temp filename.
	The following keys are recognized:
    "name" (optional, string)	the base filename to use. If this key is omitted,
									Spaces will select a default base name of it's own.
@param callback(err, info)
	err		err argument
	info	contains the following keys:
			"path": path + filename of temporary file.
*/
_spaces.os.getTempFilename = function (options, callback) {
    native function osGetTempFilename();
    	return osGetTempFilename(options, callback);
};

/** Write contents to a file.
@params options (object)
    Arguments related to this operation. The following keys are recognized:

    "filePath" (string, required)
        Full path of the file.

    "contents" (string, required)
        Contents to write to the file.

    "format" (string, optional, default "utf8")
        Format describes the data type of the contents.
        If format is "utf8" then the utf8 representation of contents is written
        to the file.
        If format is "binary", then contents is assumed to be base64 encoded
        binary data, and the string value of contents is base64 decoded before
        writing to the file.
    
    "append" (boolean, optional, default: false)
        If true then the target file is opened for "append"

@param callback(err)
	err		err argument
*/
_spaces.os.writeFile = function (options, callback) {
    native function osWriteFile();
    	return osWriteFile(options, callback);
};

/** Read contents to a file.
@params options (object)
    Arguments related to this operation. The following keys are recognized:

    "filePath" (string, required)
        Full path of the file.

    "format" (string, optional, default "utf8")
        Format describes the expected format of the file,
        If format is "utf8" then the file contents is read as a utf8 string.
        If format is "binary" then the file contents is read as binary and the
        result returned as a base64 encoded string.

@param callback(err, info)
	err		err argument
	info	contains the following keys:
			"contents" (string). The contents of the file.
*/
_spaces.os.readFile = function (options, callback) {
    native function osReadFile();
    	return osReadFile(options, callback);
};

/** Delete a file.
@params options (object)
    Arguments related to this operation. The following keys are recognized:

    "filePath" (string, required)
        Full path of the file.

@param callback(err, info)
	err		err argument
*/
_spaces.os.deleteFile = function (options, callback) {
    native function osDeleteFile();
    	return osDeleteFile(options, callback);
};

_spaces.os.folderKind = {
    USER_APPLICATION_SUPPORT: "UserApplicationSupport",
    USER_HOME: "UserHome",
    REQUIRED: "Required",
};

/** Return a path to a standard folder
@params options (object)
    Arguments related to this operation. The following keys are recognized:

    "kind" (string, required)
        The kind of folder to return,
        select string from keyValues in _spaces.os_folderKind

@param callback(err, info)
	err		err argument
	info	contains the following keys:
			"path" the file path to the requested folder
*/
_spaces.os.getStandardFolderPath = function (options, callback) {
    native function osGetStandardFolderPath();
    	return osGetStandardFolderPath(options, callback);
};

/** Return a list of sharing services that can share the specified type.
@param options (object)
    The options argument has the following form:
        "format" (string)
            The format for the data to be shared.
            This value can be "image" or "file/jpg". Image means an in-memory
            image.

@param callback     (function)  A callback notifier with the signature described below.

callback(err, info)
Info contains the following keys:
    "services":   a list of services that can shared the provided format.
*/
_spaces.os.getSharingServices = function (options, callback) {
    native function sharingGetServices();
    	return sharingGetServices(options, callback);
};

/** Return information for a single share service.
@param options (object)
    The options argument has the following form:
        "serviceTitle" (string)
            Identifier for the service to use. Should be one of the titles that would be returned
            from a call to getSharingServices.
        "format" (optional, string)
            The data format that is being shared. This value can be "image" or "file/jpg".
            Default is "image"
        "icon" (object, optional)
            If provided that an icon for the service will be returned. This object may
            contain the following keys:
            "width" (number) preferred width of the returned icon (in logical units)
            "height" (number) preferred height of the returned icon (in logical units)
            "scaleFactor" (number) scale factor of the backing store
            "scaling" (string, optional)
                Specifies how the icon should be scaled relative to its actual bounds.
                "none"  means no scaling should occur and the returned image should have the same
                    bounds as requested
                "proportionalDown" Scales the image down proportionally to fix inside the requested
                    bounds. This is the default value.

@param callback     (function)  A callback notifier with the signature described below.

callback(err, info)
Info containing information about the sharing service
*/
_spaces.os.getSharingServiceInfo = function (options, callback) {
    native function sharingGetServiceInfo();
    	return sharingGetServiceInfo(options, callback);
};

/** share data via a sharing service.
@param options (object)
    The options argument has the following form:

    An object specifying the requested image. The following keys are recognized:
    "documentId" (number, required)
        The ID of the target document related to the image.
        If the ID is less than 0, then the current document is used.
    "format" (string, required)
        The requested image format. Can be "jpg" or "png" is supported.
    "size" (object, required)
        "width"     preferred width in pixels of the image. Must be greater than 0.
        "height"     preferred height in pixels of the image. Must be greater than 0.
    "embedProfile" (boolean, optional)
        If true, then a color profile (if it exists) is embedded into the returned image.
        Default value is false.
    "scaling" (string)
        Specifies how the image should be scaled relative to its actual bounds.
        "none"  means no scaling should occur and the returned image should have the same
                bounds as requested
        "proportionalDown" Scales the image down proportionally to fix inside the requested
                bounds

	"serviceTitle" (string)
	    Identifier for the service to use. Should be one of the titles that would be returned
        from a call to getSharingServices.
        Either serviceTitle or ServiceIdentifier must be specified.

	"subject" (string, optional)
	    Value used for the sharing subject subject

@param callback     (function)  A callback notifier with the signature described below.

callback(err)
*/
_spaces.os.shareData = function (options, callback) {
    native function sharingShareData();
    	return sharingShareData(options, callback);
};

/* Return accessibility information for a specified element.
@param options (object)
    The options argument has the following form:
    "target" (string, required)
        The item whose accessibility information that should be returned.
        Currently only mainMenu is supported
    "depth" (number, required)
        The maximum number of hierarchy levels that should be returned. If this
        value is negative then all levels are returned.
        If this value is 0, then only information for the target is returned.
        Note: "depth" greater than 1 is currently ignored on Windows. This is due to a
        limitation in the Windows accessibility interface for the main menu bar.

@param callback     (function)  A callback notifier with the signature described below.

@param callback(err, info)
	err		err argument
	info	accessibility information for the provided target
*/
_spaces.os.getAccessibilityInfo = function (options, callback) {
    native function getAccessibilityInfo();
    	return getAccessibilityInfo(options, callback);
};

// ==========================================================================
// _spaces.os.keyboardFocus

if (!_spaces.os.keyboardFocus)
    _spaces.os.keyboardFocus = {};

/* Request keyboard focus from host application
@param options              (Currently unused).
@param callback (function)  A callback notifier with an err argument.
*/
_spaces.os.keyboardFocus.acquire = function (options, callback) {
    native function osKeyboardFocusAcquire();
    return osKeyboardFocusAcquire(options, callback);
};

/* Release keyboard focus to host application
@param options              (Currently unused).
@param callback (function)  A callback notifier with an err argument.
*/
_spaces.os.keyboardFocus.release = function (options, callback) {
    native function osKeyboardFocusRelease();
    return osKeyboardFocusRelease(options, callback);
};

/* Query whether Cef surface currently has keyboard focus
@param options              (Currently unused).
@param callback (function)  A callback notifier with the signature described below.

callback(err, isActive)
@param isActive (boolean)   true if Cef has keyboard focus
*/
_spaces.os.keyboardFocus.isActive = function (options, callback) {
    native function osKeyboardFocusIsActive();
    return osKeyboardFocusIsActive(options, callback);
};

/* Return information abouty attached displays
@param options              Describes which information to return.
                            Use the following to get information about physical resolution
                                "physicalResolution":true
@param callback (function)  A callback notifier with the signature described below.

callback(err, info)
@param info (list)
list of attached displays. Each display inclucdes the following information:
    globalBounds (object with: left, top, right, bottom)
            This is the entire area of the display.
    globalWorkingBounds (object with: left, top, right, bottom)
            This is the area of the display that can be used by applications. This area excludes
            areas covered by system menus, docks and other system UI
    isPrimary (boolean)
            True if the display is the primaryu display for the system
    scaleFactor (number)
            The scale factor for the display
    physicalResolution (object with: horizontal, vertical)
            Only included if the original request included "physicalResolution:true" in the options.
            Resolution in pixels per inch of the display.
*/
_spaces.os.getDisplayConfiguration = function (options, callback) {
    native function osGetDisplayConfiguration();
    return osGetDisplayConfiguration(options, callback);
};

// ==========================================================================
// _spaces.os.isConvertibleSlateMode

/** Returns the current ConvertibleSlateMode.
On Windows, convertible devices such as Surface report true when keyboard is detached, or
the orientation is not landscape with keyboard at the bottom.
On Mac, this method returns false.
@param callback     (function)  A callback notifier with the signature described below.

callback(err, mode)
@param mode (boolean) true if convertibleSlateMode is true, i.e., device is in tablet mode
*/
_spaces.os.isConvertibleSlateMode = function (callback) {
    native function osIsConvertibleSlateMode();
    return osIsConvertibleSlateMode(callback);
};

// ==========================================================================
// _spaces.os.externalEventNotification

    /// enumeration "bitset" specifying kinds of external event notification modes.
_spaces.os.externalEventNotificationMode = {

    /** Do not deliver externalXXX notifications
    */
    EXTERNAL_EVENT_NOTIFICATION_NONE: 0,

    /** Deliver externalMouseDown notifications
    */
    EXTERNAL_EVENT_NOTIFICATION_LEFT_MOUSEDOWN: 1,

    /** Deliver externalRMouseDown notifications
    */
    EXTERNAL_EVENT_NOTIFICATION_RIGHT_MOUSEDOWN: 2,

    /** Deliver externalMouseMove notifications
    */
    EXTERNAL_EVENT_NOTIFICATION_MOUSEMOVE: 4,

    /** Deliver externalMouseWheel notifications
    */
    EXTERNAL_EVENT_NOTIFICATION_MOUSEWHEEL: 8
};

/** Change the external event notification mode of: _spaces.notifierGroup.OS.
Use this API to receive notification of events occurring "externally" to a Spaces view.
Clients first establish a notifier callback using the API:

    _spaces.setNotifier(_spaces.notifierGroup.OS, ...)

Note that the notifier callback will not initially receive mouse event notifications,
as they are disabled by default. Use _spaces.os.setExternalEventNotificationMode
to then enable specific mouse events for that notifier callback.
@param  options     (object)
    Options controlling the event notification mode.
    The following keys are recognized:
    "mode" (number)
        A bitset value from _spaces.os.externalEventNotificationMode
        Combine (add, bitwise-or) individual enumerations when specifing interest in
        more than one type of external event notification.
        Use EXTERNAL_EVENT_NOTIFICATION_NONE to disable mouse event notifications.
@param  callback    (function)  A callback notifier with the signature described below.

callback(err, priorMode)
@param priorMode (number)
    previous value of _spaces.os.ExternalEventNotificationMode
*/
_spaces.os.setExternalEventNotificationMode = function(options, callback) {
    native function osSetExternalEventNotificationMode();
        return osSetExternalEventNotificationMode(options, callback);
};

/** Get the external event notification mode
@param callback (function)
    Callback notifier with the following signature: callback(err, mode)
    mode (number)     A bitset value from _spaces.os.externalEventNotificationMode
*/
_spaces.os.getExternalEventNotificationMode = function(callback) {
    native function osGetExternalEventNotificationMode();
        return osGetExternalEventNotificationMode(callback);
};

// ==========================================================================
// _spaces.window

if (!_spaces.window)
   _spaces.window = {};

/* Obtain the render mode of the window.

@param options (object)
    Currently unused
@param callback (function)
    A callback notifier with the signature described below.

callback(err, renderMode)
@param renderMode (object)   The result value.
    key "renderMode" (string):
        "osr" indicates that the window is using offscreen render mode. In this mode
            functionality that depends on the GPU may not be available or may not
            perform with the expected speed.
        "direct" if the window is using hardware accelerated rendering to an on screen
            gpu surface.
*/
_spaces.window.getRenderMode = function (options, callback) {
    native function windowGetRenderMode();
    return windowGetRenderMode(options, callback);
};

/* Obtain latent visibility of the HTML surface.
This is only valid for the contextual UI use case.

The visibility property controls whether the HTML window is presented to
the user when its parent OS window is visible.  When false, application and OS overhead
associated wth rendering and compositing the HTML window is not incurred, although
JavaScript execution may continue.

@param options (object)
    Currently unused
@param callback (function)
    A callback notifier with the signature described below.

callback(err, visibility)
@param visibility (boolean)   The result value.
    value is true when window is visible when its OS parent window is visible.
    value is false when window is not visible even though its parent OS window is visible.
*/
_spaces.window.getVisibility = function (options, callback) {
    native function windowGetVisibility();
    return windowGetVisibility(options, callback);
};

/* Set the visibility of the HTML surface.
This is only valid for the contextual UI use case
@param visibility (boolean)
    true indicates window will be visible when its OS parent window is visible.
@param options      (object)
    Specifies zero or more options for the operation. Possible keys are:
        "clearSurface" (bool)   Specifies whether or not the contents of the HTML surface
            should be cleared as part of the operation. This argument is only used when
            hiding the surface. The default value is false.
            An example where the caller should request that the surface is reset when hiding,
            is when a subsequent show should start with a different appearance.
@param callback (function)
    A callback notifier with an err argument.

NOTE: "clearSurface" is DEPRECATED. Instead JavaScript should use the manifest 
to set:
    clear_surface_on_show: true
or use the clearSurfaceOnShow API
*/
_spaces.window.setVisibility = function (visibility, options, callback) {
    native function windowSetVisibility();
    return windowSetVisibility(visibility, options, callback);
};

/** Set whether or not the HTML surface is cleared right before it is shown.
This is only used for OSR surfaces and is typically used for surfaces that use
fade in animations
@param value (boolean)
    true indicates tha the surface should be cleared before it is made visible
*/
_spaces.window.setClearSurfaceOnShow = function(value, options, callback) {
    native function windowSetClearSurfaceOnShow();
    return windowSetClearSurfaceOnShow(value, options, callback);
};

/** Return whether or not the HTML surface is cleared right before it is shown.
callback(err, result)
"result" (boolean)  true if the surface is cleared before it is shown
*/
_spaces.window.getClearSurfaceOnShow = function(options, callback) {
    native function windowGetClearSurfaceOnShow();
    return windowGetClearSurfaceOnShow(options, callback);
};

/* Obtain the bounds of the HTML surface.
@param options (object)
    Currently unused
@param callback (function)
    A callback notifier with the signature described below.

callback(err, result)
"result" (object)   An object describing the request values. This objects contain
    two structures:
    "bounds" (object)   This object contains bounds of the surface relative to the
                    owner of the surface. These bounds are in logical
                    coordinates (using the same scale factor as the owner).
                    Bounds are expressed as: "left", "top", "right", "bottom".
                    If the surface does not have an owner, then the "bounds"
                    property is omitted from the result.
    "globalBounds" (object) This object contains the global bounds of the surface.
                    These bounds are expressed in the global coordinate system that
                    is native to the host OS:
                    On OSX the global bounds are expressed in points
                    On Windows the global bounds are expressed in pixels
                    Bounds are expressed as: "left", "top", "right", "bottom"
*/
_spaces.window.getBounds = function (options, callback) {
    native function windowGetBounds();
    return windowGetBounds(options, callback);
};

/* Set the bounds of the HTML surface.
This is only valid for the contextual UI use case
@param bounds (object)
    This object must contain one of the following sub-objects:
    "bounds" (object)   This object contains bounds of the surface relative to the
                    owner of the contextual UI surface. These bounds are in logical
                    coordinates (using the same scale factor as the owner).
                    Bounds are expressed as: "left", "top", "right", "bottom"
    "globalBounds" (object) This object contains the global bounds of the surface.
                    Global bounds can be specified in one of two ways:
                        1) native-origin + native-bottom-right.
                        This form must have the following properties: "left", "top", "right", 
                        and "bottom"
                    or
                        2) native-origin + logical size
                        This form must have the following properties: "left", "top", "width",
                        and "height"

                    The native coordinate system is the coordinate system that the
                    host OS use for global locations. This is points on macOS and pixels
                    on Windows.
                    A logical size is a non-scaled size.
                    If form #1 is used, then JavaScript is responsible for choosing
                    the right scale factor. This must be the scale factor of the
                    destination bounds and as such JavaScript (on Windows) must
                    use _spaces.os.getDisplayConfiguration and use the scale factor of
                    the target display. Note in general it is incorrect to use the
                    window.devicePixelRatio or _spaces.ps.ui.scaleFactor as these values
                    express the current scale factor and not the scale factor after the
                    move. JavaScript should only use form #1 if the destination rectangle
                    is completely inside a single display. Surfaces that span displays
                    will get a scale factor based on logic in Chromium.
                    If form #2 is used, then the core implementation will find the target
                    display and use the scale factor from that display.
@param options (object)
    Currently unused
@param callback (function)
    A callback notifier with an err argument.
*/
_spaces.window.setBounds = function (info, options, callback) {
    native function windowSetBounds();
    return windowSetBounds(info, options, callback);
};

_spaces.window.level = {
    /** Window level used by top level contextual UI surfaces.
    */
    CONTEXTUAL_UI:         "contextualUI",

    /** Window level used for utility UI such as tooltips
    */
    UTILITY:                "utilityUI",
    
};

/* Obtain the level of the window
@param options (object)
    Currently unused
@param callback (function)
    A callback notifier with the signature described below.

callback(err, result)
"level" (string - _spaces.window.level)
    The level of the window (one of the entries in _spaces.window.level).
*/
_spaces.window.getLevel = function (options, callback) {
    native function windowGetLevel();
    return windowGetLevel(options, callback);
};

/* Set the level of the window.
@param info (object)
    This object must contain the following ley:
    "level" (string - _spaces.window.level)
        The level of the window (one of the entries in _spaces.window.level).
@param options (object)
    Currently unused
@param callback (function)
    A callback notifier with an err argument.
*/
_spaces.window.setLevel = function (info, options, callback) {
    native function windowSetLevel();
    return windowSetLevel(info, options, callback);
};

/* Set overlay cloaking properties on the HTML surface.
This is only valid for main-UI use cases.

@param info (object)
    Argument that holds information about the cloaking behavior. The following keys are recognized:
    "list". List of bounds that should be cloaked. Each list entry, must have the following keys:
            "left", "top", "right" and "bottom".
            To remove cloaking use an empty rectangle.
    "debug" (boolean). If true then cloaked rectangles are drawn with red. If false areas, are transparent.
    "enable" (variant)
        "immediate"
        This option can also be a list of host notifications. In this case cloaking is enabled as soon
        as one of the listed notifications are detected.
    "disable" (enumeration)
        "afterPaint". Cloaking is disabled (and reset?) when HTML image data is next received.
        "manual". Cloaking is disabled when JavaScript calls this API with an empty list of
            rectangles.
@param options (object)
    Currently unused
@param callback (function)
    A callback notifier with an err argument.
*/
_spaces.window.setOverlayCloaking = function (info, options, callback) {
    native function windowSetOverlayCloaking();
    return windowSetOverlayCloaking(info, options, callback);
};

/** Flush file caches related to the Chromium engine
*/
_spaces.window.flushFileCache = function (options, callback) {
    native function windowFlushFileCache();
    return windowFlushFileCache(options, callback);
};


// ==========================================================================
// _spaces.ims
if (!_spaces.ims)
   _spaces.ims = {};

/** Request an access token for a specific service.
@param options (object, required)
    "client" (string, required)
        Specifies the client that the access token is related to.
    "accessToken" (string, optional)
        JavaScript uses this argument to specify the token that it is already using.
        The implementation of getAccessToken uses this value to determine whether or not
        to request a new IMS token from the IMS servers.
        The algorithm is as follows:
        - If accessToken is omitted then a cached token is returned.
        - If the value of accessToken differs from the current cached token, then the
            current cached token is returned.
        - If the value of accessToken is equal to the current cached token, then a new
            IMS token is requested from the IMS service.
        This strategy allows us to avoid an unnecessary IMS call if the host obtained
        a new token after JavaScript requested its token. The strategy also prevents multiple HTML
        engines from generating multiple IMS service calls.

@param callback (function)
    A callback notifier with the signature described below.

callback(err, info)
@param info (object)   The result value.
    If an access token was obtained, then info will include a key:
        "accessToken" (string)
*/
_spaces.ims.getAccessToken = function (options, callback) {
    native function imsGetAccessToken();
    return imsGetAccessToken(options, callback);
};


// ==========================================================================
// _spaces.debug
// prefix with "_" to signify that this area is for internal Adobe use only

if (!_spaces._debug)
   _spaces._debug = {};

_spaces._debug.getRemoteDebuggingPort = function () {
    native function pgDebugGetRemoteDebuggingPort();
    return pgDebugGetRemoteDebuggingPort();
};

/** Show/Hide the developer tools
@param doShow (boolean)     if true, then the dev tools will be shown.
                            if false then the dev tools will be hidden.
@param callback (function)  A callback notifier with an err argument.
*/
_spaces._debug.showHideDevTools = function (doShow, callback) {
    native function pgShowDevTools();
    return pgShowDevTools(doShow, callback);
};

/** Debug method for forcing a call to descriptor.play with an incorrect
number of arguments while the last argument is still a notifier.
@notifier.      The notifier for this method.
                The expected result is that the notifier is invoked
                with an incorrect number of arguments error
*/
_spaces._debug.forcePlayArgumentFailure = function (notifier) {
    native function psDescBatchPlay();
    return psDescBatchPlay(notifier);
};

/** This method converts provided arguments from V8 to action descriptor types, and
back again.
The method is used to verify that the type conversion is working as expected.
The signature of the callback is as follows:
    callback(err, descriptor, reference)
*/
_spaces._debug.descriptorIdentity = function (descriptor, reference, callback) {
    native function psDebugDescIdentity();
    return psDebugDescIdentity(descriptor, reference, callback);
};

/** This method forces a C++ exception to occur in the native method dispatching.
Expected result: This method should throw a javascript exception
*/
_spaces._debug.testNativeDispatcherException = function () {
     native function pgDebugTestExecuteException();
     return pgDebugTestExecuteException();
};

/** Enable / disable the contextual context menu in Cef.
The contextual debug menu is enabled by default in debug builds

@param value (boolean)      true if the debug menu should be enabled
@param callback (function)  A callback notifier with an err argument.
*/
_spaces._debug.enableDebugContextMenu = function (value, callback) {
     native function pgDebugEnableDebugContextMenu();
     return pgDebugEnableDebugContextMenu(value, callback);
};

/** Convinience function that can be used to log results from a callback */
_spaces._debug.printResult = function () {
    var argCount = arguments.length;
    if (argCount < 1) {
        throw "Malformed callback notification. Missing 'err' argument";
    }
    var err = arguments[0];
    if (err === undefined || err.number == 0) {
        for (index = 1; index < argCount; ++index) {
            console.log("Argument #" + index + ": " + JSON.stringify(arguments[index]));
        }
    }
    else {
        console.log("Error: " + JSON.stringify(err));
    }
};

// ==========================================================================
// DEPRECATED APIs

/* DEPRECATED: Use window.setBounds()
Change the owner relative bounds of the HTML surface.
This is only valid for the contextual UI use case
@param bounds (object)
    This object must contain one of the following sub-objects:
    "bounds" (object)   This object contains bounds of the surface relative to the
                    owner of the contextual UI surface. These bounds are in logical
                    coordinates (uysing the same scale factor as the owner).
                    Bounds are expressed as: "left", "top", "right", "bottom"
    "globalBounds" (object) This object contains the global bounds of the surface.
                    These bounds are expressed in the global coordinate system that
                    is native to the host OS:
                    On OSX the global bounds are expressed in points
                    On Windows the global bounds are expressed in pixels
                    Bounds are expressed as: "left", "top", "right", "bottom"
@param options (object)
    Currently unused
@param callback (function)
    A callback notifier with an err argument.
*/
_spaces.window.changeBounds = function (info, options, callback) {
    console.log("using deprecated function changeBounds(), please use setBounds()")
    native function windowSetBounds();
    return windowSetBounds(info, options, callback);
};

