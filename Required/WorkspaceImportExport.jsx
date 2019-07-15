﻿// copyright 2010 Adobe Systems, Inc. All rights reserved.
// Written by Tai Luxon
// Adapted to be an import helper for PresetImportExport.jsx by Barkin Aygun

/*
@@@BUILDINFO@@@ WorkspaceImportExport.jsx 1.0.7
*/
/*

A few notes about this script:

General:
- Prevents importing workspaces with the same names as preset workspaces (filename or display name)
- Allows you to overwrite custom workspaces after asking you
- Handles importing over the current workspace
- Reloads the workspace list after importing
- Does not verify that files are valid or compatible workspace files when importing

Localization
- Should work in localized builds
- In localized builds, we can't prevent importing a workspace that conflicts with the localized
  name of a "deleted" preset workspace

Version Compatibility
- Updated to only work for 14.0 since it is only intended to be run from the required folder via the
  built in command.

*/

// Imports the provided files as workspaces, after checking for name collisions
function ImportWorkspaces(files)
	{

	// may get an empty list
	if (files == null)
		return;
	
	var userConflicts = new Array();
	var presetConflicts = new Array();
	
	for (var i = files.length - 1; i >= 0 ; --i)
		{
	 /*     var file = files[i];
            var msg = "absoluteURI: " + file.absoluteURI +
                            "\ndisplayName: " + file.displayName +
                            "\nfsName: " + file.fsName +
                            "\nfullName: " + file.fullName +
                            "\nlocalizedName: " + file.localizedName +
                            "\nname: " + file.name +
                            "\npath: " + file.path +
                            "\nrelativeURI: " +  file.relativeURI;
            alert (msg);*/
            
		// If the workspace conflicts with a preset or user workspace, push it onto the beginning
		// of the relevant array, and remove it from 'files'.
		// Pass non-URI formatted names
		if (PresetWorkspaceWithNameExists (decodeURI(files[i].name)))
			{
			presetConflicts.unshift(files[i]);
			files.splice(i, 1);
			}
		else if (UserWorkspaceWithNameExists(decodeURI(files[i].name)))
			{
			userConflicts.unshift(files[i]);
			files.splice(i, 1);
			}
		}
		

	// If any of the files conflict with preset workspaces, we skip them.
	// If any of the files conflict with user workspaces, we ask user if they want to replace them.

	if (presetConflicts.length > 0)
		{
		// Right now we silently skip any workspaces that conflict with preset workspaces.
		// We could copy them as the "modified" state of preset workspaces instead.
		// To do that we would want to:
		//
		// 1. Potentially warn, like down below.
		//
		// 2. Call a modified ImportScreenedWorkspaceFiles with presetConflicts which
		//    copies them to a different target and handles a successful copy differently
		//    (want to re-load the workspace, but not reset it, which I don't think our
		//    DOM supports right now).
		//
		// - tluxon 11.8.13
		}
		
	if (userConflicts.length > 0)
		{
		// Mimic our parent script code, which may have already shown this message
		if (!askedToReplace)
			{
			replaceExisting = confirm(msgReplaceFiles);
			askedToReplace = true;
			}

		// If the user wants to import the user conflicts, add them back to the 'files' array
		if (replaceExisting)
			files = files.concat(userConflicts);
		}
	
	
	// All files canceled or conflicting
	if (files.length == 0)
		return false;
		

	// Ok, let's import!
	var didCopy = ImportScreenedWorkspaceFiles(files);
	
	// Make PS reload the workspaces so they show up
	if (didCopy)
		ReloadWorkspaces();
		
	return didCopy;
	}

// Import the provided files as workspaces. All files in 'files' should already have been
// verified as not conflicting with preset workspaces and either not conflicting with user
// workspaces or ok'd to overwrite user workspaces.
function ImportScreenedWorkspaceFiles(files)
	{
	var resultObj = new Object();
	resultObj.copiedAtLeastOne = false;

	// Grab folders outside the loop
	var userFolder = GetUserWorkspacesFolder();
	var modifiedFolder = GetModifiedWorkspacesFolder();
	
	for (var i = files.length - 1; i >= 0 ; --i)
		{
		app.doProgressSubTask(i, files.length, "ImportScreenedWorkspaceFile(files[i], userFolder, modifiedFolder, resultObj)");
		}
	
	return resultObj.copiedAtLeastOne;
	}

function ImportScreenedWorkspaceFile(file, userFolder, modifiedFolder, outResult)
	{
	var decodedFilename = decodeURI(file.name);
	
	// Extensions were added to workspace files in 15.0, so add extension during copy / remove
	// to ensure we are overwriting the existing one if there is one.
	var decodedFilenameWithExt = EnsureWorkspaceExtension (decodedFilename);
	
	var targetFile = new File(userFolder.fsName + "/" + decodedFilenameWithExt);
	
	var copySucceeded = file.copy(targetFile);
	
	if (copySucceeded)
		{
		outResult.copiedAtLeastOne = true;
		
		// The copy succeeded. If we are copying over an existing workspace, reset it.
		// This does two things:
		// 1. Make sure we delete any "modified" file that may be around so we load the newly
		//	  imported version of a workspace next time it is selected.
		// 2. If we imported over the current workspace, reload it now.
		// If it is not an existing workspace, just make sure we delete any modified version
		// that may be lying around.
		
		// The filename without extension should be the displayname for user workspaces, which
		// is what we are creating, so it works for resetting the workspace.
		if (IsLoadedWorkspace(decodedFilename))
			ResetWorkspace (decodedFilename);
		else
			{
			var modifiedFile = new File (modifiedFolder.fsName + "/" + decodedFilenameWithExt);
			
			if (modifiedFile.exists)
				modifiedFile.remove();
			}
		}
	}

// Concatenates all the filenames in an array so that they can be output for the user.
function ConcatFileNamesFromFileArray(files)
	{
	var rv = '';
	
	for (var i = 0; i < files.length; ++i)
		{
		if (i > 0)
			rv += "\n";
		
		// decode URI to make spaces, etc user friendly
		rv += "\t" + decodeURI(files[i].name);
		}
	
	return rv;
	}

// Ensures .psw extension on filename
function EnsureWorkspaceExtension (filename)
	{
	var extension = ".psw";
	
	if (filename.indexOf(extension, filename.length - extension.length) !== -1)
		{
		return filename;
		}
	else
		{
		return filename + extension;
		}
	}

// Determines if there is a preset workspace with the given filename
function PresetWorkspaceWithNameExists(filename)
	{
	// Extensions were added to workspace files in 15.0, so ensure that we are looking for files
	// with extensions when looking for conflicts in the folders.
	var filenameWithExt = EnsureWorkspaceExtension (filename);
	
	// special-case Essentials
	if (filenameWithExt == "Essentials.psw")
		return true;
	
	// Test against preset workspace files
	if (FolderContainsFile(GetPresetWorkspacesFolder(), filenameWithExt))
		return true;
	
	// Test against localized preset workspace files
	if (FolderContainsFile(GetLocalizedPresetWorkspacesFolder(), filenameWithExt))
		return true;		
	
	// If we are in a localized build, check against the display names of loaded presets
	// which will be different than the filenames, but which we'd also like to avoid
	// conflicts with. We can't check for conflicts with display names of "deleted" presets.
	if (app.locale != 'en_US')
		{
		// Get loaded preset workspaces
		var wsList = GetWorkspaceList(false, true);
		
		for (var i = 0; i < wsList.length; ++i)
			{
			if (wsList[i].displayName.toLowerCase() == filename.toLowerCase())
				return true;
			}
		}
	
	// We couldn't find one!
	return false;
	}

// Determines if there is a user workspace with the given filename
function UserWorkspaceWithNameExists(filename)
	{
	// Extensions were added to workspace files in 15.0, so ensure that we are looking for files
	// with extensions when looking for conflicts in the folders.
	var filenameWithExt = EnsureWorkspaceExtension (filename);
	
	var userFolder = GetUserWorkspacesFolder();

	return FolderContainsFile(userFolder, filenameWithExt);
	
	}

// Returns true if Photoshop has a workspace in its list of loaded workspaces with the given filename
function IsLoadedWorkspace(filename)
	{
	var wsList = GetWorkspaceList(true, true);
	
	for (var i = 0; i < wsList.length; ++i)
		{
		if (decodeURI(wsList[i].filename).toLowerCase() == filename.toLowerCase())
			return true;
		}
	
	return false;
	}

// filename should NOT be in URI format
function FolderContainsFile(folder, filename)
	{
	var matchingFiles = folder.getFiles(filename);
	
	// Base Case.
	// We got back a match in this folder, confirm we have a matching File, not just a Folder or
	// a file that contains the filename but isn't the same
	if (matchingFiles.length > 0)
		{
		for (var i = 0; i < matchingFiles.length; ++i)
			{
			if ((matchingFiles[i] instanceof File) &&
				(decodeURI(matchingFiles[i].name).toLowerCase() == filename.toLowerCase()))
				return true;
			}
		}
	
	// Recursive Case
	// Search subfolders.
	var subfolders = folder.getFiles(IsFolder);
	
	for (var i = 0; i < subfolders.length; ++i)
		{
		if (FolderContainsFile(subfolders[i], filename))
			return true;
		}
	
	return false;
	}

	

// Returns true if the provided object is a Folder object
function IsFolder(object)
	{
	return object instanceof Folder;
	}

// Gets the folder where preset workspaces live
function GetLocalizedPresetWorkspacesFolder()
	{
	var platform = $.os.charAt(0) == 'M' ? 'Mac' : 'Win';
	var folder = new Folder (app.path + "/Locales/" + app.locale + "/Additional Presets/" +
								platform + "/Workspaces");
	
	return folder;
	}

// Gets the folder where preset workspaces live
function GetPresetWorkspacesFolder()
	{
	var appFolder = { Windows: app.path, Macintosh: BridgeTalk.getAppPath() + "/Contents" };
    var folder = new Folder (appFolder[File.fs] + "/Required/Workspaces");
	
	return folder;
	}

// Gets the folder where the 'original' versions of user workspace files live.
function GetUserWorkspacesFolder()
	{
	var settingsFolder = new Folder (app.preferencesFolder);
	
	if (!settingsFolder.exists)
		settingsFolder.create ();
	
	var folder = new Folder (settingsFolder.fsName + "/WorkSpaces");
	
	if (!folder.exists)
		folder.create();
	
	return folder;
	}

// Gets the folder where the 'modified' versions of workspace files live.
function GetModifiedWorkspacesFolder()
	{
	var settingsFolder = new Folder (app.preferencesFolder);
	
	if (!settingsFolder.exists)
		settingsFolder.create ();
	
	var folder = new Folder (settingsFolder.fsName + "/WorkSpaces (Modified)");
	
	if (!folder.exists)
		folder.create();
	
	return folder;
	}

// Gets the list of Photoshop workspaces
function GetWorkspaceList(includeUser, includePreset)
	{
    var wsList = new Array();
    
	// Request the workspace list from Photoshop
	var workspaceList = stringIDToTypeID( "workspaceList" );
	var typeOrdinal = charIDToTypeID( "Ordn" );
	var enumTarget = charIDToTypeID( "Trgt" );
	var classProperty = charIDToTypeID( "Prpr" );
	var classApplication = charIDToTypeID( "capp" );
	var ref = new ActionReference();
	ref.putProperty( classProperty, workspaceList );
	ref.putEnumerated( classApplication, typeOrdinal, enumTarget );
	var desc = executeActionGet( ref );
	var descList = desc.getList( workspaceList );
	
	// Convert to a friendly list
	var displayName = stringIDToTypeID( "displayName" );
	var filename = stringIDToTypeID( "name" );
	var userWorkspace = stringIDToTypeID( "user" );
	
	for (var i = 0; i < descList.count; ++i)
		{
		var wsDesc = descList.getObjectValue( i );
		var workspace = new Object;
		
		workspace.displayName = wsDesc.getString( displayName );
		workspace.filename = wsDesc.getString( filename );
		workspace.user = wsDesc.getBoolean( userWorkspace );
		
		if ((includeUser && workspace.user) || (includePreset && !workspace.user))
			wsList.push (workspace);
		}
		
	return wsList;
	}

// Resets the named workspace.
function ResetWorkspace(displayName)
	{
	var idRset = charIDToTypeID( "Rset" );
	var desc4 = new ActionDescriptor();
	var idnull = charIDToTypeID( "null" );	
		var ref3 = new ActionReference();
		var idworkspace = stringIDToTypeID( "workspace" );
		ref3.putName( idworkspace, displayName );
	desc4.putReference( idnull, ref3 );
	executeAction( idRset, desc4, DialogModes.NO );
	}


// Makes PS reload the workspaces so they show up in the switcher and menus.
function ReloadWorkspaces()
	{
	var idDlt = stringIDToTypeID( "load" );
		var desc3 = new ActionDescriptor();
		var idnull = charIDToTypeID( "null" );
			var ref2 = new ActionReference();
			var idworkspace = stringIDToTypeID( "workspace" );
			ref2.putClass( idworkspace );
		desc3.putReference( idnull, ref2 );
	executeAction( idDlt, desc3, DialogModes.NO );
	}