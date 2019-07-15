// (c) Copyright 2011, 2015.  Adobe Systems, Incorporated.  All rights reserved.

//
// CAFcropCorners.jsx - Apply Content Aware Fill (CAF) to the corners/sides
// left blank when an image is rotated or extended via a crop operation.
//
// John Peterson, Adobe Systems, 2011, 2015
//

// on localized builds we pull the $$$/Strings from a .dat file
$.localize = true;

var g_StackScriptFolderPath = app.path + "/"+ localize("$$$/ScriptingSupport/InstalledScripts=Presets/Scripts")
										+ "/Stack Scripts Only/";

$.evalFile(g_StackScriptFolderPath + "Geometry.jsx");
$.evalFile(g_StackScriptFolderPath + "Terminology.jsx");
$.evalFile(g_StackScriptFolderPath + "StackSupport.jsx" );
$.evalFile(g_StackScriptFolderPath + "PolyClip.jsx" );
function S(n) { return stringIDToTypeID(n); }

// Amount CAF area overlaps the image. This formula was arrived at empirically. 
// It needs something that grows slowly with the image area, but reliably encompasses 
// enough area that the CAF has some overlap to work with.
function overlapAmount( bounds )
{
    var overlap = Math.log( Math.sqrt(bounds.getArea()) * 5 - 18 );
    if (overlap < 5)
        overlap = 5;
    return overlap;
}

// On Debug builds, CAF is *really* slow.  So if it's a debug build and the shift key
// is down, we disable CAF and just leave the selection up.
function doContentAwareFill()
{
    var isDebugBuild = (app.scriptingVersion.search(/\s+0x80/) > 0)
                                || ($.version.search(/debug/) > 0);

    if (isDebugBuild && ScriptUI.environment.keyboardState.shiftKey)
        return;
    try {
        contentAwareFillSelection();
    }
    catch (err)
    {
        app.activeDocument.selection.deselect();
        if (err.number === -1)  // General PS error, like "not enough opaque source pixels"
        {
            // Skip the scary "General PS error" part, if possible
            var msgParts = err.message.split("-");
            if (msgParts.length > 1)
                alert(msgParts[1]);
            else
                alert(err.message);
        }
        else if (err.number != 8007) // Skip cancel
            throw err;
    }
}

// Because the polygon clipping code tends to fail if points lie exactly on edges,
// or edges are parallel & co-incident, we handle those two cases separately.

// If only rotation is applied, and the crop bounds is expanded to exactly
// include the corners of the rotated document, then compute the areas
// to be filled.
//
// AdobePatentID="P5923-US"
CAFCorners = function(angle, orginalWidth, orginalHeight)
{
    angle *= Math.PI/180.0;     // We get passed degrees, need radians.
	// Functions to find the next/previous point on a list of four points (rectangle),
	// wrapping around if necessary
    function nextPoint( i, pointList )
    {
        return pointList[(Number(i) + 1) % 4];
    }

    function prevPoint( i, pointList )
    {
        return pointList[(Number(i) == 0) ? 3 : Number(i) - 1];
    }

    var rotatedPoints, rotatedBounds;

    // Given an angle and a rectangle, compute the rotated
    // rectangle and a new bounding rectangle for it.
    computeRotation = function( angle, rect )
    {
        // Rotate rect about the origin, and find the bounds of the rotated rectangle.
        rect.setCenter( TPoint.kOrigin );
        var i;
        rotatedPoints = rect.getCornerPoints();
        
        rotatedBounds = new TRect(0,0,0,0);
        for (i in rotatedPoints)
        {
            rotatedPoints[i] = rotatedPoints[i].rotate(angle);
            rotatedBounds.extendTo( rotatedPoints[i] );
        }

        // Move the origin back to top left corner of the enclosing rect,
        // the new center is based on that.
        rotatedBounds.offset( -rotatedBounds.getTopLeft() );
        this.fNewCenter = rotatedBounds.getCenter();

        for (i in rotatedPoints)
            rotatedPoints[i] += this.fNewCenter;	
    }

    var bounds = new TRect( 0, 0, orginalWidth, orginalHeight );

    if (angle == 0.0)
	{
        return;     // Nothing to do.
	}

    computeRotation( angle, bounds );
 
    // Avoid extra white margin on the sides
    rotatedBounds.extendTo( rotatedBounds.getBottomRight() + new TPoint(1,1) );
    
    // Amount CAF area overlaps the image.  Spent too much time thinking about this.
    var overlap = overlapAmount( bounds );

    // Short hand names; R is the rotated rect's points, B is the enclosing rect's points.
    var i, R = rotatedPoints;
    var B = rotatedBounds.getCornerPoints();
    
    // For each corner...
    for (i = 0; i < 4; ++i)
    {
        // Depending on the angle, work out the geometry of the corner area left
        // exposed when the rectangular image is rotated
        if (angle > 0)
        {
            R[1].fX += 1.0; // Avoid extra white margin on the sides
            R[2].fY += 1.0;
            var offsetVector = (nextPoint( i, R ) - R[i]).normalize() * overlap;
            
            var selPoints = [ prevPoint( i, R ), B[i], R[i], 
                                        R[i] + offsetVector,
                                        prevPoint( i, R ) + offsetVector,
                                        prevPoint( i, R ) ];
        }
        else
        {
            R[2].fX += 1.0;
            R[3].fY += 1.0;
            var offsetVector = (prevPoint( i, R ) - R[i] ).normalize() * overlap;
            
            var selPoints = [ R[i], B[i], nextPoint( i, R ),
                                        nextPoint( i, R ) + offsetVector,
                                        R[i] + offsetVector, R[i] ];
        }
            
        createPolygonSelection( selPoints, i > 0 );
        doContentAwareFill();
     }
}

//
// No rotation, so compute the leftover rectangles to fill.
//
function CAFNoRotate( docRight, docBottom, cropRect )
{
    var docRect = new TRect( 0, 0, docRight, docBottom );
    
    var overlap = overlapAmount( docRect );
    var CAFoffset = -cropRect.getTopLeft();
    var CAFinset =  new TPoint( -overlap, -overlap );
    
    var rectList = cropRect.subtract( docRect );
    if (rectList)
    {
        for (var i = 0; i < rectList.length; ++i)
        {
            var CAFrect = rectList[i];
            CAFrect.offset( CAFoffset );
            CAFrect.inset( CAFinset );
            var rectPoints = CAFrect.getCornerPoints();
            rectPoints.push( rectPoints[0] );   // Close polygon
            createPolygonSelection( rectPoints, i > 0 );    // addTo selection after i=0
         }
         doContentAwareFill();
     }
}

//
// General case - document is rotated and (possibly) cropped against the cropRect
//
//
// AdobePatentID="P5923-US"
function CAFWithRotate( docRight, docBottom, angle, cropPoints )
{
    angle *= Math.PI/180.0;     // We get passed degrees, need radians.
    var i, docRect = new TRect( 0, 0, docRight, docBottom );

    var cropCenter = TRect.getBounds( cropPoints ).getCenter();
    var docPoints = docRect.getCornerPoints();
    
    // Undo the rotation of the cropRect, and apply it to the docRect
    for (i = 0; i < 4; ++i)
    {
        docPoints[i] = ((docPoints[i] - cropCenter).rotate(angle)) + cropCenter;
        cropPoints[i] = ((cropPoints[i] - cropCenter).rotate(angle)) + cropCenter;
    }
    
    // Offset so it's in the cropRect coordinates
    var cropRect = TRect.getBounds(cropPoints);
    var offset = new TPoint( -cropRect.fLeft, -cropRect.fTop );
    cropRect.offset( offset  );
    for (i = 0; i < 4; ++i)
    {
        docPoints[i] = docPoints[i] + offset;
        cropPoints[i] = cropPoints[i] + offset;
    }
    // Shrink the docRect to produce some overlap.
    var diagDist = Math.sqrt(docRight*docRight+docBottom*docBottom);
    var shrinkBy = (diagDist - overlapAmount(docRect)*2)/diagDist;
    
    docRect = TRect.getBounds(docPoints);
    cropCenter = docRect.getCenter();
    for (i = 0; i < 4; ++i)
        docPoints[i] = (docPoints[i] - cropCenter) * shrinkBy + cropCenter;
    
    // If the document is completely inside the cropping area, then
    // no clipping is required.  Just build the clip poly from the two inputs.
    if (cropRect.contains( docRect ))
    {
        docPoints.reverse();
        docPoints.push( docPoints[0] );
        cropPoints = cropPoints.concat( docPoints );
        cropPoints.push( cropPoints[3] );
        cropPoints.push( cropPoints[0] );
        createPolygonSelection( cropPoints );
        doContentAwareFill();
    }
    else    // General case: call polygon clipper
    {
        var polyList = TPoint.intersectConvexPolygons( docPoints, cropPoints, "minusSubject" );
        if (polyList) {
            for (i = 0; i < polyList.length; ++i)
                createPolygonSelection( polyList[i], i > 0 );
            doContentAwareFill();
         }
    }
}

// In order to get just a single event in the history state, we invoke the
// functions above via these helper functions to suspend History

var stateName = localize("$$$/CropTool/CropOptions/AutoFillOnCrop=Content-Aware Crop");

function runCAFRotateOnly( angle, width, height )
{
    var args = [angle, width, height].join(",");
    app.activeDocument.suspendHistory( stateName, "CAFCorners(" +args + ");");
};

// Note cropRect is passed in as a string, and evaluated with the suspendHistory call.
function runCAFNoRotate( dr, db, cropRect )
{
    var args = [dr, db, cropRect].join(",");
    app.activeDocument.suspendHistory( stateName, "CAFNoRotate(" + args + ");" );
}

function runCAFRotate( dr, db, cropRect, rotate, cropRectPts )
{
    var args = [dr, db, rotate, cropRectPts].join(",");
 //   $.writeln("CAFWithRotate(" + args + ");");
    app.activeDocument.suspendHistory( stateName, "CAFWithRotate(" + args + ");" );

}
//CAFNoRotate(768,512,new TRect(-36.000000,-32.000000,724.000000,544.000000));

//CAFWithRotate(3072,2048,new TRect(-70.973594,-245.201704,3287.349782,2148.302146),-3.225869,new TPoint(-6.993695,7.630765));

//CAFWithRotate(3072,2048,new TRect(562.709409,-121.149406,3277.244709,2219.612453),-3.600068,new TPoint(-5.290591,175.653866));
// Tests

//runCAF(-2.6574382011561966,3072.0000000000000,2048.0000000000000);
//CAFNoRotate( 3072, 2048, -72, -65.967789, 3168, 2131.960284 )
//CAFWithRotate(3072,2048,-178.820332,-137.560556,3018.96466,2057.560556,-2.48215);
