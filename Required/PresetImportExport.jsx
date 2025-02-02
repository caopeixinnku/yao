$.localize = true;

#include "./WorkspaceImportExport.jsx"
#target photoshop;

// The associative array of extension to folder name used for verification/import
// If you want the import to accept a new extension into a specific folder, add them here
var extensionToFolderMap = {
    "ADO"	:	"Duotones",
    "abr"	:	"Brushes",
    "acb"	:	"Color Books",
    "aco"	:	"Color Swatches",
    "act"	:	"Optimized Colors",
    "acv"	:	"Curves",
    "ahu"	:	"Hue and Saturation",
    "alv"	:	"Levels",
    "asl"	:	"Styles",
    "atn"	:	"Actions",
    "blw"	:	"Black and White",
    "cha"	:	"Channel Mixer",
    "csh"	:	"Custom Shapes",
    "dae"	:	"Meshes",
    "eap"	:	"Exposure",
    "gds"	:	"Guides",
    "grd"	:	"Gradients",
    "hdt"	:	"HDR Toning",
    "iros"	:	"Optimized Output Settings",
    "irs"	:	"Optimized Settings",
    "js"	:	"Scripts",
    "jsx"	:	"Scripts",
    "kys"	:	"Keyboard Shortcuts",
    "mnu"	:	"Menu Customization",
    "p3e"	:	"Repousse",
    "p3l"	:	"Lights",
    "p3m"	:	"Materials",
    "p3r"	:	"Volumes",
    "pat"	:	"Patterns",
    "pbk"	:	"Pixel Bender Files",
    "ple"	:	"Lighting Effects",
    "psw"	:	"WorkSpaces",
    "shc"	:	"Contours",
    "tbr"	:	"Custom Toolbars",
    "tpl"	:	"Tools",
    "zvt"	:	"Zoomify"
};

// ZStrings
	var titleDialog			= localize("$$$/PresetImportExport/titleDialog=Export/Import Presets");
	var titleFileExport 	= localize("$$$/PresetImportExport/titleFileExport=Export Presets");
	var titleFileImport 	= localize("$$$/PresetImportExport/titleFileImport=Import Presets");
	var titleListBoxExport	= localize("$$$/PresetImportExport/titleListBoxExport=Presets to Export");
	var titleListBoxUser 	= localize("$$$/PresetImportExport/titleListBoxUser=Your Presets");
	var titleListBoxImport	= localize("$$$/PresetImportExport/titleListBoxImport=Presets to Import");
	var titleListBoxSource	= localize("$$$/PresetImportExport/titleListBoxSource=Source Presets");
	var titleSelectFolder 	= localize("$$$/PresetImportExport/titleSelectFolder=Select a folder");
	var titleChooseExportFolder = localize("$$$/PresetImportExport/titleChooseExportFolder=Select an Export Folder");
	var titleChooseImportFolder = localize("$$$/PresetImportExport/titleChooseImportFolder=Select an Import Folder");
	var titleExportPanel 	= localize("$$$/PresetImportExport/titleExportPanel=Export Presets");
	var titleImportPanel 	= localize("$$$/PresetImportExport/titleImportPanel=Import Presets");
	var titleErrorMsg		= localize("$$$/PresetImportExport/titleErrorMsg=Export/Import Error");
	var titleSourcePath 	= localize("$$$/PresetImportExport/titleSourcePath=Source Folder: ");
	var totalNumToImport 	= localize("$$$/PresetImportExport/totalNumToImport=Presets to Import: ");
	var totalNumToExport	= localize("$$$/PresetImportExport/totalNumToExport=Presets to Export: ");
	
	var btnQuitName 		= localize("$$$/PresetImportExport/btnQuitName=Cancel");
	var btnRemoveAllName 	= localize("$$$/PresetImportExport/btnRemoveAllName=Remove All");
	var btnAddAllName 		= localize("$$$/PresetImportExport/btnAddAllName=Add All");
	var btnSelectFolderName = localize("$$$/PresetImportExport/btnSelectFolderName=Select Import Folder");
	
	var helpTipListBoxDo 	= localize("$$$/PresetImportExport/helpTipListBoxDo=Double click the item to remove it from list.");
	var helpTipListBoxDont 	= localize("$$$/PresetImportExport/helpTipListBoxDont=Double click the item to add it to the list.");
	
	var msgNoFileToExport 	= localize("$$$/PresetImportExport/msgNoFileToExport=Select the presets to export.");
	var msgNoFileToImport 	= localize("$$$/PresetImportExport/msgNoFileToImport=Select the presets to import.");
	var msgSearchingFiles	= localize("$$$/PresetImportExport/msgSearchingFiles=Searching for preset files");
	var msgExportComplete 	= localize("$$$/PresetImportExport/msgExportComplete=Presets have been succesfully exported.");
	var msgImportComplete 	= localize("$$$/PresetImportExport/msgImportComplete=Presets have been successfully imported.");
	var msgImportCompleteRestart 	= localize("$$$/PresetImportExport/msgImportCompleteRestart=Presets have been successfully imported. Restart Photoshop for changes to take effect.");
	var msgCompleteError 	= localize("$$$/PresetImportExport/msgCompleteError=An error occured when importing the presets. Preset import failed.");
	var msgAdmin 			= localize("$$$/PresetImportExport/msgAdmin=Administrative privileges are required to save these presets.");
	var msgFolderExists 	= localize("$$$/PresetImportExport/msgFolderExists=The exported presets folder already exists in this location. Do you want to replace this folder?");
	var msgFolderCreate		= localize("$$$/PresetImportExport/msgFolderCreate=Presets cannot be exported, because a folder could not be created in the chosen location.");
	var msgNothingToImport 	= localize("$$$/PresetImportExport/msgNothingToImport=The selected folder has no presets.");
	var msgDeleteConfirm	= localize("$$$/PresetImportExport/msgDeleteConfirm=This will replace your existing presets folder:" );
	var msgDeleteFail		= localize("$$$/PresetImportExport/msgDeleteFail=An error occured while replacing presets folder.");
	var msgWrongVersion		= localize("$$$/PresetImportExport/msgWrongVersion=This version of Photoshop is not supported.");
	var msgImportingFiles	= localize("$$$/PresetImportExport/msgImportingFiles=Importing files...");
	var msgExportingFiles	= localize("$$$/PresetImportExport/msgExportingFiles=Exporting files...");
	var msgCopyFailure		= localize("$$$/PresetImportExport/msgCopyFailure=Failed to copy file:");
	var msgReplaceFiles		= localize("$$$/PresetImportExport/msgReplaceFile=Presets with same names already exist in your Presets folders. Do you want to replace those files?");

	var kResultSuccess		= 0;
	var kResultCancel		= 1;
	var kResultError		= 2;

// Utility functions collapse here
	function getDirApp(){
		/*
		The full path of the location of the Adobe Photoshop application.
		*/
		return app.path;
	}
	
	function getDirCommonFiles(){
		/*
		In Windows, the value of %CommonProgramFiles% (by default, C:\\Program Files\\Common Files)
		In Mac OS, /Library/Application Support
		*/
		return Folder.commonFiles;
	}
	
	function getDirUserData(){
		/*
		In Windows, the value of %USERDATA% (by default, C:\\Documents and Settings\\ username \\Application Data) 
		In Mac OS, ~/Library/Application Support.
		*/
		return Folder.userData;
	}
	
	function getDirUserPreferencesMac(){
		/*
		In Windows, the value of %USERDATA% (by default, C:\\Documents and Settings\\ username \\Application Data) 
		In Mac OS, ~/Library/Application Support.
		*/
		var tempUserData = decodeURI(Folder.userData).toString().replace("Application Support", "Preferences");
		return Folder(tempUserData);
	}
	
	function alertScriptError(msg){
		alert(msg, titleErrorMsg, true);
		errorToQuit++;
	}
	
	function getCurOS(curOS){
		try{
			var myOS;
			if(curOS.match("Macintosh")){
				myOS = "mac";
			}else if(curOS.match("XP")){
				myOS = "winxp";
			}else if(curOS.match("Vista")){
				myOS = "winvista";
			}else{
				myOS = "win7";
			}
			return myOS;
		}catch(e){
			alertScriptError("Line: " + $.line +" - "+ e);
		}
	}
	
	// This function also brings up an error if the version is not 13 or 12, we have undefined behavior for rest
	function getAppVer(){
		try{
			var curAppVer = app.version;
			var arrayAppVer = curAppVer.split("."); 
			var appVerNo = parseInt(arrayAppVer[0]);
			var versionStr = "";
			if (appVerNo == 19) {
				versionStr = "CC 2018";
			} else if (appVerNo == 18) {
				versionStr = "CC 2017";			
			} else if (appVerNo == 17) {
				versionStr = "CC 2015.5";			
			} else if (appVerNo == 16) {
				versionStr = "CC 2015";			
			} else if (appVerNo == 15) {
				versionStr = "CC 2014";			
			} else if (appVerNo == 14) {
				versionStr = "CC";
			} else if (appVerNo == 13) {
				versionStr = "CS6";
			} else if (appVerNo == 12) {
				versionStr = "CS5";
			} else {
				alertScriptError(msgWrongVersion);
			}
			return versionStr;
		}catch(e){
			alertScriptError("Line: " + $.line +" - "+ e);
		}
	}
	
	function cleanupMultiplesFromArray(theArray){
		for (var i=0;i<theArray.length-1;i++) {
			if (theArray[i] === theArray[i+1]) {
				theArray.splice(i, 1);
				i = i - 1;
			}
		}
	}
			

// Folder related functions

	function getFileArray(tmpFolderItems, outPresets) {
		try {
			app.doProgress(msgSearchingFiles, "getFileArrayTask(tmpFolderItems, outPresets)");
		} catch (e) {
			// do nothing, probably user cancel.
		}
	}
	
	// returns an array of [parent folder name , file Object] arrays
	function getFileArrayTask(tmpFolderItems, outPresets) {
		var objItem;
		var folderCount = 0;
		
		for (var i=0;i<tmpFolderItems.length;i++) {
			if (tmpFolderItems[i] instanceof Folder)
				folderCount++;
		}
		
		var folderIndex = 0;
		
		for (var i=0;i<tmpFolderItems.length;i++){
			objItem = tmpFolderItems[i];
			if (objItem instanceof Folder){
				objFolderName = objItem.name;
				if (!app.doProgressSubTask(folderIndex++, folderCount, "getFileArrayTask(objItem.getFiles(), outPresets)"))
					throw "cancel";
			} else if ( -1 != objItem.fsName.indexOf(".DS_Store")){
				continue;	// Skip Mac's hidden file
			} else{
				var fileExt = objItem.fsName.split('.').pop();
				if (fileExt in extensionToFolderMap || (objItem.parent.name.indexOf("WorkSpaces") != -1)) {
					outPresets.push(new Array(objItem.parent.name,objItem));
				}
			}
		}
		objItem = null;
	}
	
	// Allows the user to choose a folder to export presets to
	// Presets will be put in a folder named "Exported Presets" under the chosen folder
	// Everything else in the target folder will be deleted first.
	function GetExportFolder() {

		function DeleteFolder(targetFolder)
		{
			try {
				var folderContents = targetFolder.getFiles();
				for (var i=0;i<folderContents.length;i++){
					objItem = folderContents[i];
					if (objItem instanceof Folder){
						DeleteFolder(objItem);
						objItem.remove();
					} else {
                           objItem.remove();
                      }
				}
                  return true;
			} catch (e) {
				alertScriptError(msgDeleteFail);
				return false;
			}
		}
	
	
		var exportContainerFolderName = 'Exported Presets';
		
		var exportLocation = Folder.selectDialog( titleChooseExportFolder );
		if ( exportLocation == null ) {
			return null;
		}
	
		var exportFolder = new Folder(exportLocation.fsName + "/" + exportContainerFolderName);
		
		if (exportFolder.exists)
		{
			if (!confirm(msgFolderExists))
			{
				return null;
			} else {
				if (!confirm (msgDeleteConfirm + exportFolder.fullName)) {
					return null;
				}
				if (!DeleteFolder(exportFolder)) {
					return null;
				}
			}
		}
		exportFolder.create();
		if (!exportFolder.exists)
		{
			alert(msgFolderCreate);
			return null;
		}
		return exportFolder;
	}
	
	// Allows the user to choose a folder to import from
	// Simpler than getExportFolder because there isn't much to do
	function GetImportFolder() {
		var importLocation = Folder.selectDialog( titleChooseImportFolder );
		if (importLocation == null) { 
			return null;
		}
		
		return importLocation;
	}

// Script starts executing here
try {
	app.bringToFront();
	app.displayDialogs = DialogModes.NO;
	
	// Arrays that keep track of presets
	var arrayExportPresets = new Array();
	var arrayDontExportPresets = new Array();
	var arrayImportPresets = new Array();
	var arrayDontImportPresets = new Array();
	
	var exportFolderPresetsTotal = 0;
	var importFolderPresetsTotal = 0;
	
	// Flags & Folders
    var errorToQuit;
    var win; // The dialog
    var curOS = getCurOS($.os);
    var versionStr = getAppVer();  
    var dirCommonFiles = getDirCommonFiles(); 
    var dirUserData = getDirUserData();
    var dirUserPreferencesMac = getDirUserPreferencesMac();
    var dirApp = getDirApp();
    var replaceExisting = false;
    var askedToReplace = false;
    
    // Important folders the script reads
	var dirUserPresets = new Folder(dirUserData + "/Adobe/Adobe Photoshop " + versionStr + "/Presets");
    var dirUserWorkspaces = new Folder();
    var dirUserWorkspacesModified = new Folder();
    if(curOS.match("mac")){
        dirUserWorkspaces = new Folder(dirUserPreferencesMac + "/Adobe Photoshop " + versionStr + " Settings/WorkSpaces");
    }else{
        dirUserWorkspaces = new Folder(dirUserPreferencesMac + "/Adobe Photoshop " + versionStr + " Settings/WorkSpaces");
    }
    
    // Since we start in export pane, this function should be called before dialog is shown
    refreshExportFiles();
    showDialog();
    
} catch (e) {
	alertScriptError("Line: " + e.line + " - " + e);
}

// UI Functions
	// Loads the Export arrays with user's presets
	function refreshExportFiles(){
		arrayDontExportPresets = new Array();
		
		getFileArray(dirUserPresets.getFiles(), arrayDontExportPresets);
		getFileArray(dirUserWorkspaces.getFiles(), arrayDontExportPresets);
		
		arrayExportPresets = new Array();
		exportFolderPresetsTotal = arrayDontExportPresets.length;
	}
	
	// Adds the correct arrays to the list boxes for processed files
	function addListUserPresetsDo(exportFlag){
		var fileArray;
		var listBox;
		var bigListBox;
		if (exportFlag) {
			fileArray = arrayExportPresets;
			bigListBox = win.panelMain.panelExport.gUserPresets.gUserPresetsListBox;
			listBox = win.panelMain.panelExport.gUserPresets.gUserPresetsListBox.lstToExportPresets;
		} else {
			fileArray = arrayImportPresets;
			bigListBox = win.panelMain.panelImport.gUserPresets.gUserPresetsListBox;
			listBox = win.panelMain.panelImport.gUserPresets.gUserPresetsListBox.lstToImportPresets;
		}
		listBox.removeAll();
		var counterUserPresets = 0;
		
		
		for(var i=0;i<fileArray.length;i++){
			bigListBox[counterUserPresets++] = 
				listBox.add ('item', "(" + decodeURI(fileArray[i][0]) +")  "+ 
								decodeURI(fileArray[i][1].name));
		}
	}
	
	// Adds the correct arrays to the list boxes for skipped files
	function addListUserPresetsDont(exportFlag){
		var fileArray;
		var listBox;
		var bigListBox;
		if (exportFlag) {
			fileArray = arrayDontExportPresets;
			bigListBox = win.panelMain.panelExport.gUserPresets.gUserPresetsListBox;
			listBox = win.panelMain.panelExport.gUserPresets.gUserPresetsListBox.lstToNotExportPresets;
		} else {
			fileArray = arrayDontImportPresets;
			bigListBox = win.panelMain.panelImport.gUserPresets.gUserPresetsListBox;
			listBox = win.panelMain.panelImport.gUserPresets.gUserPresetsListBox.lstToNotImportPresets;
		}
		listBox.removeAll();
		var counterUserPresets = 0;
		
		
		for(var i=0;i<fileArray.length;i++){
			bigListBox[counterUserPresets++] = 
				listBox.add ('item', "(" + decodeURI(fileArray[i][0]) +")  "+ 
								decodeURI(fileArray[i][1].name));
		}
	}
	
	// Updates the text message at the footer that gives a status of preset numbers
	function updatePresetCount(exportFlag) {
		if (exportFlag) {
			win.panelMain.panelExport.gUserPresets.gUserPresetsFooterGroup.txtUserPresetsCount.text = 
				totalNumToExport + arrayExportPresets.length.toString() + "/" + exportFolderPresetsTotal.toString();
		} else {
			win.panelMain.panelImport.gUserPresets.gUserPresetsFooterGroup.txtUserPresetsCount.text = 
				totalNumToImport + arrayImportPresets.length.toString() + "/" + importFolderPresetsTotal.toString();
		}
	}
	
	// Prepares and shows the dialog
	function showDialog(){
		try{
			var ui = // dialog resource object
		"""dialog { 
			text: 'Import/Export Presets',
			panelMain: Panel {
				type: 'tabbedpanel',
				orientation:'stack', 
				panelExport: Panel {
					type: 'tab',
					gUserPresets: Group { orientation: 'column', alignChildren: 'left', 
						gUserPresetsTxt: Group { orientation: 'row', alignChildren: 'left', 
							txtSource: StaticText {text:'txtDont', bounds:[0,0,300,17]}, 
							txtSpace: StaticText {text:'', bounds:[0,0,40,20]}, 
							txtTarget: StaticText {text:'txtDo' ,bounds:[0,0,300,17]}
						}, 
						gUserPresetsListBox: Group { orientation: 'row', alignChildren: 'left', 
							lstToNotExportPresets: ListBox { text: 'txtDo', bounds:[0,0,300,400]},
							gUserPresetsListButtons: Group { orientation: 'column', alignChildren: 'center',
								btnAddExport: Button { text: '>', bounds:[0,0,24,24] },
								btnRemoveExport: Button { text: '<', bounds:[0,0,24,24] } 
							},
							lstToExportPresets: ListBox { text: 'txtDont', bounds:[0,0,300,400]}
						}, 
						gUserPresetsFooterGroup: Group { orientation: 'row', 
							txtUserPresetsCount: StaticText { text:'', bounds:[0,0,400,24], properties:{name:'txtCount'} }, 
						},
						gButtons: Group { orientation: 'row', alignment: 'right', 
							btnRemoveAll: Button { text:'Remove All', properties:{name:'start'} }, 
							btnAddAll: Button { text:'Add All', properties:{name:'start'} }, 
							btnStart: Button { text:'Start', properties:{name:'start'} } 
						},
					}, 
				},
				panelImport: Panel {
					type: 'tab',
					gUserPresets: Group { orientation: 'column', alignChildren: 'left', 
						gUserPresetsTxt: Group { orientation: 'row', alignChildren: 'left', 
							txtSource: StaticText {text:'txtDont', bounds:[0,0,300,17]}, 
							txtSpace: StaticText {text:'', bounds:[0,0,40,20]}, 
							txtTarget: StaticText {text:'txtDo' ,bounds:[0,0,300,17]}
						}, 
						gUserPresetsListBox: Group { orientation: 'row', alignChildren: 'left',
							lstToNotImportPresets: ListBox { text: 'txtDo', bounds:[0,0,300,400]},
							gUserPresetsListButtons: Group { orientation: 'column', alignChildren: 'center',
								btnAddImport: Button { text: '>' , bounds:[0,0,24,24]},
								btnRemoveImport: Button { text: '<' , bounds:[0,0,24,24]} 
							},
							lstToImportPresets: ListBox { text: 'txtDont', bounds:[0,0,300,400]}
						}, 
						gUserPresetsFooterGroup: Group { orientation: 'row', alignment: 'left',
							txtUserPresetsCount: StaticText { text:'', bounds:[0,0,400,24],  properties:{name:'txtCount'} }, 
						},
						gButtons: Group { orientation: 'row', alignment: 'right', 
							btnSelectFolder: Button { text:'Select Folder', properties:{name:'start'} },
							btnRemoveAll: Button { text:'Remove All', properties:{name:'start'} }, 
							btnAddAll: Button { text:'Add All', properties:{name:'start'} }, 
							btnStart: Button { text:'Start', properties:{name:'start'} } 
						},
					}, 
				},
			},
			gCancelButton: Group { orientation: 'row', alignment: 'right', 
				btnQuit: Button { text:'Quit', properties:{name:'cancel'} } 
			},
		}""";
		
		win = new Window(ui);

		//UI Element titles/texts
		win.text = titleDialog;
		
		win.panelMain.panelExport.text = titleExportPanel;
		win.panelMain.panelExport.gUserPresets.gButtons.btnStart.text = titleExportPanel;
		win.panelMain.panelExport.gUserPresets.gButtons.btnRemoveAll.text = btnRemoveAllName;
		win.panelMain.panelExport.gUserPresets.gButtons.btnAddAll.text = btnAddAllName;
    	win.panelMain.panelExport.gUserPresets.gUserPresetsListBox.lstToExportPresets.helpTip = helpTipListBoxDo;
		win.panelMain.panelExport.gUserPresets.gUserPresetsListBox.lstToNotExportPresets.helpTip = helpTipListBoxDont;
		win.panelMain.panelExport.gUserPresets.gUserPresetsTxt.txtSource.text = titleListBoxUser;
    	win.panelMain.panelExport.gUserPresets.gUserPresetsTxt.txtTarget.text = titleListBoxExport;
    	
    	win.panelMain.panelImport.text = titleImportPanel;
		win.panelMain.panelImport.gUserPresets.gButtons.btnStart.text = titleImportPanel;
		win.panelMain.panelImport.gUserPresets.gButtons.btnRemoveAll.text = btnRemoveAllName;
		win.panelMain.panelImport.gUserPresets.gButtons.btnAddAll.text = btnAddAllName;
		win.panelMain.panelImport.gUserPresets.gButtons.btnSelectFolder.text = btnSelectFolderName;
		win.panelMain.panelImport.gUserPresets.gUserPresetsListBox.lstToImportPresets.helpTip = helpTipListBoxDo;
		win.panelMain.panelImport.gUserPresets.gUserPresetsListBox.lstToNotImportPresets.helpTip = helpTipListBoxDont;    
		win.panelMain.panelImport.gUserPresets.gUserPresetsTxt.txtSource.text = titleListBoxSource;
    	win.panelMain.panelImport.gUserPresets.gUserPresetsTxt.txtTarget.text = titleListBoxImport;
    	
		win.gCancelButton.btnQuit.text = btnQuitName;
		
    	// Assign Functions to buttons
    	win.panelMain.panelExport.gUserPresets.gButtons.btnStart.onClick = btnExportOnClick;
    	win.panelMain.panelExport.gUserPresets.gButtons.btnRemoveAll.onClick = btnExportRemoveAllOnClick;
    	win.panelMain.panelExport.gUserPresets.gButtons.btnAddAll.onClick = btnExportAddAllOnClick;

    	win.panelMain.panelImport.gUserPresets.gButtons.btnSelectFolder.onClick = btnSelectFolderOnClick;
    	win.panelMain.panelImport.gUserPresets.gButtons.btnStart.onClick = btnImportOnClick;
    	win.panelMain.panelImport.gUserPresets.gButtons.btnRemoveAll.onClick = btnImportRemoveAllOnClick;
    	win.panelMain.panelImport.gUserPresets.gButtons.btnAddAll.onClick = btnImportAddAllOnClick;
    
		win.gCancelButton.btnQuit.onClick = function () { win.close(false); };
	
    	// Build the list and update the counts
    	addListUserPresetsDo(true);
    	addListUserPresetsDont(true);
    	addListUserPresetsDo(false);
    	addListUserPresetsDont(false);
		updatePresetCount(true);
		updatePresetCount(false);
		
		// Set the functions on the preset lists
		win.panelMain.panelExport.gUserPresets.gUserPresetsListBox.lstToExportPresets.onDoubleClick = function(e) {
			var delItemIndex = this.selection.index;
			arrayExportPresets.splice (delItemIndex, 1);
			addListUserPresetsDo(true);
			addListUserPresetsDont(true);
			updatePresetCount(true);
		};
		win.panelMain.panelExport.gUserPresets.gUserPresetsListBox.lstToNotExportPresets.onDoubleClick = function(e) {
			var delItemIndex = this.selection.index;
			arrayExportPresets.push(arrayDontExportPresets[delItemIndex]);
			arrayExportPresets.sort();
			cleanupMultiplesFromArray(arrayExportPresets);
			addListUserPresetsDo(true);
			addListUserPresetsDont(true);
			updatePresetCount(true);
		};
		win.panelMain.panelImport.gUserPresets.gUserPresetsListBox.lstToImportPresets.onDoubleClick = function(e) {
			var delItemIndex = this.selection.index;
			arrayImportPresets.splice (delItemIndex, 1);
			addListUserPresetsDo(false);
			addListUserPresetsDont(false);
			updatePresetCount(false);
		};
		win.panelMain.panelImport.gUserPresets.gUserPresetsListBox.lstToNotImportPresets.onDoubleClick = function(e) {
			var delItemIndex = this.selection.index;
			arrayImportPresets.push(arrayDontImportPresets[delItemIndex]);
			arrayImportPresets.sort();
			cleanupMultiplesFromArray(arrayImportPresets);
			addListUserPresetsDo(false);
			addListUserPresetsDont(false);
			updatePresetCount(false);
		};
		
		win.panelMain.panelExport.gUserPresets.gUserPresetsListBox.gUserPresetsListButtons.btnAddExport.onClick = function(e) {
			var itemIndex = win.panelMain.panelExport.gUserPresets.gUserPresetsListBox.lstToNotExportPresets.selection.index;
			arrayExportPresets.push(arrayDontExportPresets[itemIndex]);
			arrayExportPresets.sort();
			cleanupMultiplesFromArray(arrayExportPresets);
			addListUserPresetsDo(true);
			addListUserPresetsDont(true);
			updatePresetCount(true);
		};
    	win.panelMain.panelExport.gUserPresets.gUserPresetsListBox.gUserPresetsListButtons.btnRemoveExport.onClick = function(e) {
    		var itemIndex = win.panelMain.panelExport.gUserPresets.gUserPresetsListBox.lstToExportPresets.selection.index;
			arrayExportPresets.splice(itemIndex, 1);
			addListUserPresetsDo(true);
			addListUserPresetsDont(true);
			updatePresetCount(true);
    	};
    	
		win.panelMain.panelImport.gUserPresets.gUserPresetsListBox.gUserPresetsListButtons.btnAddImport.onClick = function(e) {
			var itemIndex = win.panelMain.panelImport.gUserPresets.gUserPresetsListBox.lstToNotImportPresets.selection.index;
			arrayImportPresets.push(arrayDontImportPresets[itemIndex]);
			arrayImportPresets.sort();
			cleanupMultiplesFromArray(arrayImportPresets);
			addListUserPresetsDo(false);
			addListUserPresetsDont(false);
			updatePresetCount(false);
		};
    	win.panelMain.panelImport.gUserPresets.gUserPresetsListBox.gUserPresetsListButtons.btnRemoveImport.onClick = function(e) {
    		var itemIndex = win.panelMain.panelImport.gUserPresets.gUserPresetsListBox.lstToImportPresets.selection.index;
			arrayImportPresets.splice(itemIndex, 1);
			addListUserPresetsDo(false);
			addListUserPresetsDont(false);
			updatePresetCount(false);
    	};
    	
		win.center();
		var ret = win.show();
		
		}catch(e){
            alertScriptError("Line: " + e.line + " - " + e);
         }
	}
	
	// Button functions
	
	// When Export Button is Clicked
	function btnExportOnClick(){
		try {
			if (win.panelMain.panelExport.gUserPresets.visible == true){
				if (arrayExportPresets.length != 0){
					exportPresetFiles(arrayExportPresets);
				} else {
					alert(msgNoFileToExport)
				}
			}
		} catch(e){
			alertScriptError("Line: " + e.line + " - " + e);
		}
	}
	
	// When Import Button is Clicked
	function btnImportOnClick(){
		try {
			if (win.panelMain.panelImport.gUserPresets.visible == true){
				if (arrayImportPresets.length != 0){
					importPresetFiles(arrayImportPresets);
				} else {
					alert(msgNoFileToImport)
				}
			}
		} catch(e){
			alertScriptError("Line: " + e.line + " - " + e);
		}
	}
	
	// When Remove All in Export Pane is Clicked
	function btnExportRemoveAllOnClick(){
		try{
			if(win.panelMain.panelExport.gUserPresets.visible == true){
				arrayExportPresets = new Array();
				addListUserPresetsDo(true);
				updatePresetCount(true);
			}
		}catch(e){
			alertScriptError("Line: " + e.line +" - "+ e);
		}
	}
	
	// When Remove All in Import Pane is Clicked
	function btnImportRemoveAllOnClick(){
		try{
			if(win.panelMain.panelImport.gUserPresets.visible == true){
				arrayImportPresets = new Array();
				addListUserPresetsDo(false);
				updatePresetCount(false);
			}
		}catch(e){
			alertScriptError("Line: " + e.line +" - "+ e);
		}
	}
	
	// When Add All in Export Pane is Clicked
	function btnExportAddAllOnClick(){
		try{
			if(win.panelMain.panelExport.gUserPresets.visible == true){
				arrayExportPresets = new Array();
				arrayExportPresets = arrayExportPresets.concat(arrayDontExportPresets);
				addListUserPresetsDo(true);
				updatePresetCount(true);
			}
		}catch(e){
			alertScriptError("Line: " + e.line +" - "+ e);
		}	
	}
	
	// When Add All in Import Pane is Clicked
	function btnImportAddAllOnClick(){
		try{
			if(win.panelMain.panelImport.gUserPresets.visible == true){
				arrayImportPresets = new Array();
				arrayImportPresets = arrayImportPresets.concat(arrayDontImportPresets);
				addListUserPresetsDo(false);
				updatePresetCount(false);
			}
		}catch(e){
			alertScriptError("Line: " + e.line +" - "+ e);
		}	
	}
	
	// When Select Folder in Import Pane is Clicked
	function btnSelectFolderOnClick() {
		var importFolder = GetImportFolder();
		
		if (importFolder == null) {
			return null;
		}
		
		arrayDontImportPresets = new Array();
		
		getFileArray(importFolder.getFiles(), arrayDontImportPresets);
		
		arrayImportPresets = new Array();
		importFolderPresetsTotal = arrayDontImportPresets.length;
		
		addListUserPresetsDo(false);
		addListUserPresetsDont(false);
		updatePresetCount(false);
	}

// Main functions that do the heavy lifting
	// Exports the given array
	function exportPresetFiles(filesToExport){
		var exportFolder = GetExportFolder();    
		
		if (exportFolder == null)
			return null;
			
		win.hide();
		
		// Force the progress to show immediately because we may be copying very
		// large files, during which PS does not get a chance to pop the dialog
		// after the normal delay.
		var resultObj = new Object(); // object for pass-by-ref to get a result back
		app.doForcedProgress(msgExportingFiles, "doExportPresetFiles(resultObj)");
		
		if (resultObj.result == kResultSuccess) {
			alert(msgExportComplete, titleFileExport);
		} else {
			if (resultObj.result == kResultError)
				alert(msgCompleteError,titleFileExport,true);
			refreshExportFiles();
			showDialog();
		}
		
		function doExportPresetFiles(outResult){
			try{
				outResult.result = kResultSuccess;
					
				for (var i=0; i < filesToExport.length; i++){
					var targetFolder = Folder(exportFolder + "/" + filesToExport[i][0]);
					var targetFile = targetFolder + "/" + filesToExport[i][1].name;
					// if the preset folder does no exist, create it
					if (!targetFolder.exists) {
						var createFolder = targetFolder.create();
					}
					// if it's still not existing, we assume something went wrong
					if (targetFolder.exists){
						var fileCopy = filesToExport[i][1].copy(targetFile);
					}
					if (!fileCopy || !File(targetFile).exists){
						alertScriptError(msgCopyFailure + decodeURI(filesToExport[i][1].name));
					}
					if (!app.updateProgress(i, filesToExport.length))
						{
						outResult.result = kResultCancel;
						break;
						}
				}
			} catch(e) {
				outResult.result = kResultError;
				//alertScriptError("Line: " + e.line + "-" + e);
			}
		}
	}

	// Imports the given array
	function importPresetFiles(filesToImport) {
		function importSinglePresetFile(presetFile, outResult)
		{
			var fileExt = presetFile.fsName.split('.').pop();
				
			var targetFolder = Folder(dirUserPresets + "/" + extensionToFolderMap[fileExt]);
			var targetFile = targetFolder + "/" + presetFile.name;
			var fileCopiedOrIgnored = true;
			
			if (!askedToReplace && File(targetFile).exists) {
				replaceExisting = confirm(msgReplaceFiles);
				askedToReplace = true;
			}
			
			if (!targetFolder.exists) {
				targetFolder.create();
			}
			
			if (targetFolder.exists && (!File(targetFile).exists || replaceExisting)) {
				fileCopiedOrIgnored = presetFile.copy(targetFile);
			}
			if (!fileCopiedOrIgnored ||  !File(targetFile).exists){
				alertScriptError(msgCopyFailure + decodeURI(presetFile.name));
			}  
			
			outResult.result = (fileCopiedOrIgnored && replaceExisting);
		}
		
		var workspacesToImport = new Array();
		
		win.hide();
		
		var resultObj = new Object(); // object for pass-by-ref to get a result back
		resultObj.anyNonWorkspaceFilesImported = false; // workspace import doesn't require restart
		
		// Force the progress to show immediately because we may be copying very
		// large files, during which PS does not get a chance to pop the dialog
		// after the normal delay.
		app.doForcedProgress(msgImportingFiles, "doImportPresetFiles(resultObj)");
		
		if (resultObj.result == kResultSuccess) {
			if (resultObj.anyNonWorkspaceFilesImported)
				alert(msgImportCompleteRestart, titleFileImport);
			else
				alert(msgImportComplete, titleFileImport);
		}else{
			if (resultObj.result == kResultError)
				alert(msgCompleteError,titleFileImport, true);
			showDialog();
		}
	
		function doImportPresetFiles(outResult){
			try{
				outResult.result = kResultSuccess;
				var filesImported = 0;
				
				for (var i=0; i < filesToImport.length; i++){
					if (filesToImport[i][0] == "WorkSpaces") {
						workspacesToImport.push(filesToImport[i][1]);
					} else if (decodeURI(filesToImport[i][0]) == "WorkSpaces (Modified)") {
						workspacesToImport.push(filesToImport[i][1]);
					} else {
						var resultObj = new Object();
						if (!app.doProgressSubTask(filesImported++, filesToImport.length, "importSinglePresetFile(filesToImport[i][1], resultObj)"))
							throw "cancel";
						if (resultObj.result)
							outResult.anyNonWorkspaceFilesImported = true;
					}
				}
				
				if (!app.doProgressSubTask(filesToImport.length - 1, filesToImport.length, "ImportWorkspaces(workspacesToImport)"))
					throw "cancel";
			} catch(e) {
				if (e == "cancel")
					outResult.result = kResultCancel;
				else
					outResult.result = kResultError;
			//	alertScriptError("Line: " + e.line + "-" + e);
			}
		}
		
	}	
