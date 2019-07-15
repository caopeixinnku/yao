//agf_include "vertex2fragment_uv2.glsl"

float shadeAAlineAlongOneDimension(vec4 texelCorners, vec2 lineRanges)
{
	float leftside = lineRanges[0];
	float rightside = lineRanges[1];
	float d00 = texelCorners[0] - leftside;
	float d01 = texelCorners[1] - leftside;
	float d10 = texelCorners[2] - leftside;
	float d11 = texelCorners[3] - leftside;
	float positiveWeight = 0.0;
	float negativeWeight = 0.0;
	if (d00 > 0.0) positiveWeight += d00; else	negativeWeight += (-d00);
	if (d01 > 0.0) positiveWeight += d01; else	negativeWeight += (-d01);
	if (d10 > 0.0) positiveWeight += d10; else	negativeWeight += (-d10);
	if (d11 > 0.0) positiveWeight += d11; else	negativeWeight += (-d11);
	float alpha = 0.0;
	if (positiveWeight > 0.0)
	{
		if (negativeWeight > 0.0)
			alpha = positiveWeight / (positiveWeight + negativeWeight);
		else
		{
			positiveWeight = 0.0;
			negativeWeight = 0.0;
			d00 = rightside - texelCorners[0];
			d01 = rightside - texelCorners[1];
			d10 = rightside - texelCorners[2];
			d11 = rightside - texelCorners[3];
			if (d00 > 0.0) positiveWeight += d00; else	negativeWeight += (-d00);
			if (d01 > 0.0) positiveWeight += d01; else	negativeWeight += (-d01);
			if (d10 > 0.0) positiveWeight += d10; else	negativeWeight += (-d10);
			if (d11 > 0.0) positiveWeight += d11; else	negativeWeight += (-d11);
			alpha = positiveWeight / (positiveWeight + negativeWeight);
		}
	}
	return alpha;
}
uniform vec4 groundPlaneColorOpacity;
uniform vec4 groundPlaneDistanceFadeColorOpacity;
uniform vec2 groundPlaneLineThickness;
uniform vec3 groundPlaneUColor;
uniform vec3 groundPlaneVColor;
uniform vec4 printPlateSizeUV;
uniform vec3 printPlateColor;
uniform vec2 tickEveryUV;

void main()
{
	float U = vertOut_UV.x;
	float V = vertOut_UV.y;
	vec2 dX = dFdx(vertOut_UV.xy);
	vec2 dY = dFdy(vertOut_UV.xy);
	float dXu = dX.x;
	float dXv = dX.y;
	float dYu = dY.x;
	float dYv = dY.y;
	vec2 uvPixSize;
	uvPixSize.x = sqrt(dXu*dXu + dYu*dYu);
	uvPixSize.y = sqrt(dXv*dXv + dYv*dYv);
	//
	vec2  uvSpacingFactor = vec2(1.0, 1.0);
	uvSpacingFactor.x = float((uvPixSize.x / 0.25));
	uvSpacingFactor.y = float((uvPixSize.y / 0.25));
	float averageSpacing = (max(uvSpacingFactor.x, uvSpacingFactor.y));
	vec2 kernelSize = vec2(0.5, 0.5);
	float clutterOpacityFactor = 1.0;
	vec2 uvMultiplier = vec2(1.0, 1.0);
	if (averageSpacing > 1.0)
	{
		clutterOpacityFactor = 1.0 / (averageSpacing*averageSpacing);
		//kernelSize *= 1.0/(averageSpacing);
	}
	vec2 thickness = vec2(groundPlaneLineThickness[0], groundPlaneLineThickness[0]);
	vec3 color = groundPlaneColorOpacity.rgb;
	if (abs(U) < 2.0*uvPixSize.x)
	{
		color = groundPlaneVColor;
		thickness.x = groundPlaneLineThickness[1];
		thickness.y = groundPlaneLineThickness[1];
	}
	if (abs(V) < 2.0*uvPixSize.y)
	{
		color = groundPlaneUColor;
		thickness.x = groundPlaneLineThickness[1];
		thickness.y = groundPlaneLineThickness[1];
	}
	vec2 uv00 = vertOut_UV.xy - kernelSize.x*dX - kernelSize.y*dY + vec2(0.5, 0.5);
	vec2 uv01 = vertOut_UV.xy - kernelSize.x*dX + kernelSize.y*dY + vec2(0.5, 0.5);
	vec2 uv11 = vertOut_UV.xy + kernelSize.x*dX + kernelSize.y*dY + vec2(0.5, 0.5);
	vec2 uv10 = vertOut_UV.xy + kernelSize.x*dX - kernelSize.y*dY + vec2(0.5, 0.5);
	uv00 *= uvMultiplier;
	uv01 *= uvMultiplier;
	uv11 *= uvMultiplier;
	uv10 *= uvMultiplier;
	vec2 iUV00 = vec2(floor(uv00));
	vec2 iUV01 = vec2(floor(uv01));
	vec2 iUV11 = vec2(floor(uv11));
	vec2 iUV10 = vec2(floor(uv10));
	float lineFaloffAlpha = 0.0;
	vec2 nuv00 = uv00 - iUV00;
	vec2 nuv01 = uv01 - iUV01;
	vec2 nuv11 = uv11 - iUV11;
	vec2 nuv10 = uv10 - iUV10;
	vec2 lineD;
	float alphaU = 0.0;
	float alphaV = 0.0;
	vec2 min0 = min(iUV00, iUV01);
	vec2 min1 = min(iUV11, iUV10);
	vec2 min_int = min(min0, min1);
	if (iUV00.x > min_int.x) nuv00.x += 1.0;
	if (iUV01.x > min_int.x) nuv01.x += 1.0;
	if (iUV10.x > min_int.x) nuv10.x += 1.0;
	if (iUV11.x > min_int.x) nuv11.x += 1.0;
	if (iUV00.y > min_int.y) nuv00.y += 1.0;
	if (iUV01.y > min_int.y) nuv01.y += 1.0;
	if (iUV10.y > min_int.y) nuv10.y += 1.0;
	if (iUV11.y > min_int.y) nuv11.y += 1.0;
	float xticks = tickEveryUV.x;
	float yticks = tickEveryUV.y;
	vec2 uLineD = vec2(0.5 - thickness.x*uvPixSize.x*0.5, 0.5 + thickness.x*uvPixSize.x*0.5);
	vec4 uCorners = vec4(nuv00.x, nuv01.x, nuv10.x, nuv11.x);
	alphaU = max(alphaU, shadeAAlineAlongOneDimension(uCorners, uLineD));
	float i = 0.0;
	float tf = 0.0;
	float onPrintPlate = 0.0;
	if (printPlateSizeUV.x > 0.0 && printPlateSizeUV.y > 0.0)
		{
		if (abs(U) < printPlateSizeUV.x*0.5 && abs(V) < printPlateSizeUV.y*0.5)
			{
			onPrintPlate = 1.0;
			}
		}
	if (abs(V) < 0.4 && onPrintPlate > 0.5)
	{
		for (i = 0.0; i <= 1.0 + xticks; i = i + xticks)
		{
			tf = 0.25;
			if (i >= 1.0)
			{
				tf = 0.5;
			}
			else
			{
				if (abs(V) > 0.2)  tf = 0.0;
			}
			if (tf > 0.0)
			{
				vec2 uTickD = vec2(i - thickness.x*uvPixSize.x*tf, i + thickness.x*uvPixSize.x*tf);
				alphaU = max(alphaU, shadeAAlineAlongOneDimension(uCorners, uTickD));
			}
		}
	}
	vec2 vLineD = vec2(0.5 - thickness.y*uvPixSize.y*0.5, 0.5 + thickness.y*uvPixSize.y*0.5);
	vec4 vCorners = vec4(nuv00.y, nuv01.y, nuv10.y, nuv11.y);
	alphaV = shadeAAlineAlongOneDimension(vCorners, vLineD);
	if (abs(U) < 0.4 && onPrintPlate > 0.5)
	{
		for (i = 0.0; i <= 1.0 + yticks; i = i + yticks)
		{
			tf = 0.25;
			if (i >= 1.0)
			{
				tf = 0.5;
			}
			else
			{
				if (abs(U) > 0.2)  tf = 0.0;
			}
			if (tf > 0.0)
			{
				vec2 vTickD = vec2(i - thickness.x*uvPixSize.x*tf, i + thickness.x*uvPixSize.x*tf);
				alphaV = max(alphaV, shadeAAlineAlongOneDimension(vCorners, vTickD));
			}
		}
	}
	lineFaloffAlpha = clamp(1.0 - (1.0 - alphaU)*(1.0 - alphaV), 0.0, 1.0);
	float alpha = groundPlaneColorOpacity.a*((1.0 - clutterOpacityFactor)*groundPlaneDistanceFadeColorOpacity.a + clutterOpacityFactor*lineFaloffAlpha);
	vec4 lineColor = vec4(color.r, color.g, color.b, alpha);
	if (onPrintPlate > 0.5)
	{
		lineColor.rgb = mix(printPlateColor, lineColor.rgb, alpha);
		lineColor.a = 1.0;
	}
	else
	{
		if (printPlateSizeUV.z < 0.5)
		{
			lineColor.a = 0.0; //In-3Dprint-dialog case
		}
	}
	lineColor.a = lineColor.a * printPlateSizeUV.a;
	gl_FragColor = lineColor;
}