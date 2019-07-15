//agf_include "main_shared_functions_fragment.glsl"

//agf_include "main_vertex2fragment.glsl"

#define ENABLE_IBL


#ifdef ENABLE_AGFDiffuseMap
uniform sampler2D	diffuse_texture;
uniform mat4		diffuse_texture_matrix;
#endif

#ifdef ENABLE_AGFSpecularColorMap
uniform sampler2D	specular_intensity_texture;
uniform mat4		specular_intensity_texture_matrix;
#endif

#ifdef ENABLE_AGFSpecularExponentMap
uniform sampler2D	specular_exponent_texture;
uniform mat4		specular_exponent_texture_matrix;
#endif

#ifdef ENABLE_AGFNormalMap
uniform sampler2D	normal_map_texture;
uniform mat4		normal_map_texture_matrix;
#endif

#ifdef ENABLE_AGFBumpMap
uniform sampler2D	bump_gradient_texture;
uniform mat4		bump_gradient_texture_matrix;
uniform vec4		bumpTextureNormalizer;
uniform float		bumpStrength;
#endif



#if NUMBER_OF_ACTIVE_INFINITE_LIGHTS > 0
uniform InfiniteLight	infiniteLights[NUMBER_OF_ACTIVE_INFINITE_LIGHTS];
#endif

#if NUMBER_OF_ACTIVE_SPOT_LIGHTS > 0
uniform SpotLight		spotLights[NUMBER_OF_ACTIVE_SPOT_LIGHTS];
#endif

#if NUMBER_OF_ACTIVE_POINT_LIGHTS > 0
uniform PointLight		pointLights[NUMBER_OF_ACTIVE_POINT_LIGHTS];
#endif

#ifdef	ENABLE_IBL
uniform mat4 sphericalHarmonicMatrixRed;
uniform mat4 sphericalHarmonicMatrixGreen;
uniform mat4 sphericalHarmonicMatrixBlue;
uniform mat4 sphericalHarmonicsTransformationMatrix;
#endif

#ifdef ENABLE_AGFSphereEnvironmentMap
uniform sampler2D	environment_texture;
uniform mat4		environment_texture_matrix;
uniform sampler3D	discreteShininess3DTex;
#endif

#ifdef ENABLE_AGFReflectivityMap
uniform sampler2D reflectivity_texture;
uniform mat4	  reflectivity_texture_matrix;
#endif

#ifdef ENABLE_AGFSelfIlluminationMap
uniform sampler2D self_illumination_texture;
uniform mat4	  self_illumination_texture_matrix;
uniform vec4	  self_illumination_texture_range;
#endif

#ifdef	ENABLE_AGFOpacityMap
uniform sampler2D object_opacity_texture;
uniform mat4	  object_opacity_texture_matrix;
#endif

uniform Material	material;
uniform vec4		unscaledIBLColor;
uniform mat4		fmodelViewCamera;
uniform mat4		iEyeToWorldMatrix;

uniform mat4		reflectionTransformationMatrix;
uniform vec4		environmentColor;
uniform vec4		iGlobalAmbientColor;

uniform vec4		clippingPlane;
uniform vec4		extraReflectionClippingPlane;
uniform mat4		worldToUV;
uniform sampler2D	noiseTexture;
uniform mat4		objectUVtoReflectionUV;
uniform sampler2D  reflectionTexture;
uniform sampler2D  reflectionDepthTexture;
uniform vec4		roughness;
uniform mat4		inverseMVPMatrix;
uniform vec4		groundPlaneWorldEquation;
uniform vec4		reflectionBufferDimensions;
void main()
{
		vec3 materialDiffuseColor = material.Kd.rgb;
		vec3 materialSpecularColor =  material.Ks.rgb;
		vec3 newNormal = normalize(vertOut_vNormal);
		vec4 texLookup = vec4(0.0, 0.0, 0.0, 0.0); //Temporary variable, to use in all the texture Lookups
		vec4 finalColor = vec4(0.0, 0.0, 0.0, 0.0);
		vec4 geomPointInEyeSpace = vec4(vertOut_vEye, 1.0);
		vec4 geomPointInWorldSpace = iEyeToWorldMatrix * geomPointInEyeSpace;
		vec4 UV =  worldToUV * geomPointInWorldSpace;
		UV.z = 0.0;
		UV.w = 1.0;

#ifdef ENABLE_AGFSpecularColorMap
		texLookup =  xformTex2D(specular_intensity_texture, UV, specular_intensity_texture_matrix);
		float specAlpha = texLookup.a*material.le_params[1];
		materialSpecularColor = mix(material.Ks.rgb, texLookup.rgb, specAlpha);
#endif

#ifdef ENABLE_AGFDiffuseMap
		texLookup = xformTex2D(diffuse_texture, UV, diffuse_texture_matrix);
		materialDiffuseColor = mix(material.Kd.rgb, texLookup.rgb, texLookup.a);
#endif

		vec3 diffuseColor = materialDiffuseColor;
		vec3 specularColor = vec3(0, 0, 0);

	//Determine if triangle is front/back facing
//###################################################### NORMAL ALTERATION (BUMP/NORMAL MAPS calc GOES HERE) ##############################################
	if (gl_FrontFacing)//back-facing condition check
	   {
	   newNormal = -newNormal;
	   }
else
	   {
	   newNormal = newNormal;
	   }

//###################################################### END OF NORMAL ALTERATION ##############################################


//############################################# DIRECT LIGHTING/SHADOWS CALCULATIONS #################################################
		vec3 diff = vec3(0.0, 0.0, 0.0);
		vec3 diffNoShadow=vec3(0.0, 0.0, 0.0);
#ifdef ENABLE_LIGHTING
		vec3 spec = vec3(0.0, 0.0, 0.0);
		int i=0;
		float screenSpaceRandomNumber=0.0;
		float shininess=0.0;

#if NUMBER_OF_ACTIVE_INFINITE_LIGHTS > 0
		for (i=0;i<NUMBER_OF_ACTIVE_INFINITE_LIGHTS;i++)
			{
			//infiniteLights[i].position = fmodelViewCamera * infiniteLights[i].position;	
			InfiniteLight transformedLight;
			transformedLight = infiniteLights[i];
			transformedLight.position = fmodelViewCamera * infiniteLights[i].position;	
			EvaluateInfiniteLight(newNormal, -(vertOut_vEye), transformedLight, diff, spec, diffNoShadow, shininess,iEyeToWorldMatrix,screenSpaceRandomNumber);
			}
#endif
#if NUMBER_OF_ACTIVE_SPOT_LIGHTS > 0
		for (i=0;i<NUMBER_OF_ACTIVE_SPOT_LIGHTS;i++)
			{
			SpotLight transformedLight;
			transformedLight = spotLights[i];
			transformedLight.worldPosition = spotLights[i].position;
			transformedLight.position = fmodelViewCamera * spotLights[i].position;	
			transformedLight.direction = fmodelViewCamera * spotLights[i].direction;	
			EvaluateSpotLight(newNormal, -(vertOut_vEye), transformedLight, diff, spec, diffNoShadow, shininess,iEyeToWorldMatrix,screenSpaceRandomNumber);
			}
#endif
#if NUMBER_OF_ACTIVE_POINT_LIGHTS > 0
		for (i=0;i<NUMBER_OF_ACTIVE_POINT_LIGHTS;i++)
			{
			PointLight transformedLight;

			transformedLight = pointLights[i];
			transformedLight.worldPosition = pointLights[i].position;
			transformedLight.position = fmodelViewCamera * pointLights[i].position;	
			EvaluatePointLight(newNormal, -(vertOut_vEye), transformedLight, diff, spec, diffNoShadow, shininess,iEyeToWorldMatrix,screenSpaceRandomNumber);
			}
#endif
		diff = diff*material.le_params[2];//exposure
		spec = spec*material.le_params[2];//exposure
#endif



//############################################# IMAGE-BASED LIGHTING (SPHERICAL HARMONICS) #################################################
	vec3 iblDiffuseOnly=vec3(0.0, 0.0, 0.0);
#ifdef ENABLE_IBL
		vec4 normal1 = newNormal.xyzz;
		normal1.w = 0.0;
		vec4 normalIBL = (sphericalHarmonicsTransformationMatrix * normal1);
		normalIBL.w = 0.0;
		normalize(normalIBL);
		normalIBL.w = 1.0;
		vec3   diffuse_intensity =  vec3(1, 1, 1);
		iblDiffuseOnly = vec3(	dot(normalIBL, (sphericalHarmonicMatrixRed*normalIBL)),
								dot(normalIBL, (sphericalHarmonicMatrixGreen*normalIBL)), 
								dot(normalIBL, (sphericalHarmonicMatrixBlue*normalIBL)) );
 		vec3 diffuseIBL = diffuse_intensity * iblDiffuseOnly;
 		//diffuseIBL = texSPHERE(IBLTexture, normalIBL.xyz).rgb; //For Debugging env. orientation only - use tex sample instead of spherical harmonic
		diff += diffuseIBL;
		diffNoShadow += diffuseIBL;
#endif

	diff+=iGlobalAmbientColor.rgb;
	diffNoShadow+=iGlobalAmbientColor.rgb;
 //############################################# SHADOW OPACITY CALCULATION #################################################
	float intensityWithShadows = diff.x + diff.y + diff.z;
	float intensityNoShadows = diffNoShadow.x + diffNoShadow.y + diffNoShadow.z;

	float ratio = 1.0;
	if (intensityNoShadows > 1e-6) 
		{
		ratio = intensityWithShadows / intensityNoShadows;
		}
							
	if (ratio < 0.0) 
		{
		ratio = 0.0;
		}

	if (ratio > 1.0) 
		{
		ratio = 1.0;
		}
	vec4 shadowedColor;
	vec4 blendedColor;
	vec4 reflectedColor;

	float reflectivity = material.reflectivity;
#ifdef ENABLE_AGFReflectivityMap
		vec3 materialReflectivity3 = vec3(material.reflectivity);
		texLookup = xformTex2D(reflectivity_texture, UV,reflectivity_texture_matrix);
		reflectivity = mix(materialReflectivity3, texLookup.rgb, texLookup.a).r; 
#endif

vec4 reflectedColorFactor;
reflectedColorFactor.rgb = materialSpecularColor.rgb;
reflectedColorFactor.a = 1.0;

float opacity = material.opacity;
#ifdef ENABLE_AGFOpacityMap
	texLookup = xformTex2D(object_opacity_texture, UV, object_opacity_texture_matrix);
	opacity = texLookup.a*material.opacity; 
#endif
	shadowedColor.rgb = mix(materialDiffuseColor, vec3(0.0, 0.0, 0.0), ratio);
	shadowedColor.a = (1.0-ratio)*opacity ; //mix(opacity, 0, ratio)
//######################################### GETTING THE GROUND PLANE REFLECTION ###############################################################
	vec4 reflectionUV = vertOut_fTexCoord0;
	reflectionUV.z = 0.0;
	reflectionUV.w = 1.0;
	float reflectedDepth = 0.0;
	vec4 groundPlanePointClip = vertOut_fClipPosition/vertOut_fClipPosition.w;
	texLookup = xformTex2DProjective(reflectionDepthTexture, geomPointInWorldSpace, objectUVtoReflectionUV);
	vec4 reflectedPointClip = groundPlanePointClip;
	reflectedPointClip.z = (texLookup.r-0.5)*2.0;
	vec4 reflectedPointWorld = inverseMVPMatrix*reflectedPointClip;
	reflectedPointWorld = reflectedPointWorld/reflectedPointWorld.w;

	float distanceToReflector = abs(dot(reflectedPointWorld, groundPlaneWorldEquation));
	//float reflectedDistance = (texLookup.r -groundPlaneDepth)*100.0; //(texLookup.r-groundPlaneDepth)*100.0;//(texLookup.r-groundPlaneDepth)*;
	//Calculate pixel distance at the reflector point
	vec4 reflectedPointOffsetX0 = reflectedPointClip+vec4(-reflectionBufferDimensions[2]*2.0,0.0, 0.0, 0.0);
	vec4 reflectedPointOffsetX1 = reflectedPointClip+vec4(+reflectionBufferDimensions[2]*2.0,0.0, 0.0, 0.0);
	vec4 reflectedPointWorldX0 = inverseMVPMatrix*reflectedPointOffsetX0;
	vec4 reflectedPointWorldX1 = inverseMVPMatrix*reflectedPointOffsetX1;
	reflectedPointWorldX0 = reflectedPointWorldX0/reflectedPointWorldX0.w;
	reflectedPointWorldX1 = reflectedPointWorldX1/reflectedPointWorldX1.w;
	float kernelSizeWorldSinglePixel = length(reflectedPointWorldX0.xyz - reflectedPointWorldX1.xyz);
	float kernelSizeWorld = distanceToReflector*roughness.r*8.0;
	float pixelKernelSize = clamp(kernelSizeWorld/kernelSizeWorldSinglePixel, 1.0, 2048.0);

	float lodLevel = log(pixelKernelSize)/log(2.0);
	texLookup = xformTex2DProjectiveLOD(reflectionTexture, geomPointInWorldSpace, objectUVtoReflectionUV, lodLevel);
	reflectedColor = texLookup;
	float reflectedOpacity = reflectedColor.a*reflectivity;
	
	reflectedColor = reflectedColor*reflectedColorFactor;
	reflectedColor.a = reflectedOpacity;
//######################################### MIXING THE REFLECTED/SHADOW VALUES ###############################################################

	blendedColor = mix(reflectedColor, shadowedColor, (1.0-reflectedColor.a));
	blendedColor.a = 1.0 - (1.0-reflectedColor.a)*(1.0-shadowedColor.a);
	
	finalColor = blendedColor;
	
	finalColor = clamp(finalColor, vec4(0.0, 0.0, 0.0, 0.0), vec4(1.0, 1.0, 1.0, 1.0));
 	if (UV.x < 0.0|| UV.x > 1.0 || UV.y < 0.0 || UV.y > 1.0)
 		{
 		finalColor = vec4(0.0, 0.0, 0.0, 0.0);
 		}

//########################################## FINAL PROCESSING ################################################################################		
	gl_FragColor = finalColor;//vec4(intensityNoShadows, intensityNoShadows, intensityNoShadows, 1);
}
