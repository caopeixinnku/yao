
//agf_include "main_shared_functions_fragment.glsl"

//agf_include "main_vertex2fragment.glsl"


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
#endif
uniform float		bumpStrength;

#ifdef ENABLE_ROUGHNESS
uniform sampler2D	roughness_texture;
uniform mat4		roughness_texture_matrix;
uniform vec4		roughness;
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
uniform mat4		iEyeToNormalizedBBOXMatrix;

uniform mat4		reflectionTransformationMatrix;
uniform vec4		environmentColor;
uniform vec4		iGlobalAmbientColor;

uniform vec4 clippingPlane;
uniform vec4 extraReflectionClippingPlane;
uniform vec4 refraction_flag; //First component is refraction_flag, second component is piggybacked transparency threshold
uniform vec4 useVertexForBase;
uniform sampler2D	background_texture;
uniform mat4		background_texture_matrix;
uniform mat4		refractionTransformationMatrix;
uniform vec4		bumpNormalPreviewFlags; //[0] - normal map strength (1/0), [1] - bump map extra strength. Used in print preview;
#ifdef HAS_VOLUME_BUMP_NOISE
uniform sampler3D  volumeNoiseTexture;
uniform vec4       volumeNoiseBumpParams;
#endif
uniform vec4       agf_bump_2_params;
uniform vec2		agf_force_flat_shading; //First elem forces flat shading, second piggybacked flag for forcing parallel projection reflection
void main()
{


//########################################## CLIPPING PLANES ################################################################################		

float clipSign = dot(clippingPlane.xyz, vertOut_vPosition.xyz)+clippingPlane.w;
if (clipSign < 0.0) discard;

float extraClipSign = dot(extraReflectionClippingPlane.xyz, vertOut_vPosition.xyz)+extraReflectionClippingPlane.w;
if (extraClipSign < 0.0) discard;

//########################################## END OF CLIPPING PLANES ################################################################################		

		vec4 UV = vertOut_fTexCoord0;
		vec3 materialSpecularColor =  material.Ks.rgb;
		vec3 newNormal = normalize(vertOut_vNormal);
		vec4 texLookup = vec4(0.0, 0.0, 0.0, 0.0); //Temporary variable, to use in all the texture Lookups
		

//########################################## OPACITY MANAGEMENT ################################################################################		
		
		float finalOpacity = 0.0;
		float opacity=material.opacity;

#ifdef	ENABLE_AGFOpacityMap
		texLookup = xformTex2D(object_opacity_texture, UV, object_opacity_texture_matrix);		
#ifdef USE_ALPHA_FOR_OPACITY_MAP
		opacity = texLookup.a*material.opacity;
#else
		vec3 materialOpacity3 = vec3(material.opacity, material.opacity, material.opacity);
		//Blending base opacity value with the one in the opacity map. 
		vec3 perColorOpacity =  mix(materialOpacity3, texLookup.rgb, texLookup.a); 
		//We have got to choose _SINGLE_ opacity value for GL framebuffer
		//We are choosing maximum of the 3
		float rg_maxopacity = max (perColorOpacity.r, perColorOpacity.g);
		opacity = max (rg_maxopacity, perColorOpacity.b); 
#endif
#endif
		finalOpacity = opacity;

		if (refraction_flag[2]>0.5)
			{
			finalOpacity = material.opacity;
			}
		else
			{
			if (refraction_flag[1]>=0.0)
				{
				if (finalOpacity < refraction_flag[1])
					discard;
				else
					finalOpacity = 1.0;
				}
			}

	if (finalOpacity == 0.0) 
		{
		discard;
		}

	if (useVertexForBase[2] > 0.5) //Stochastic transparency
		{
		float heisenbergOpacity = rand(gl_FragCoord.xy+vertOut_vPosition.zz);

		float testOpacity = finalOpacity; 

		if (testOpacity < 0.05)
			{
			testOpacity = 0.1*finalOpacity;
			}

		if (heisenbergOpacity > testOpacity)
			{
			discard;
			}

		finalOpacity = 1.0;
		}


//########################################## END OF OPACITY MANAGEMENT ################################################################################		


       vec4 finalColor = vec4(0.0, 0.0, 0.0, 0.0);
       vec3 materialBaseColor = material.Kd.rgb;
		if (useVertexForBase[0]>0.5)
			{
			materialBaseColor = vertOut_Color.rgb; 
			}
		vec3 materialDiffuseColor = materialBaseColor;
#ifdef ENABLE_AGFSpecularColorMap
		texLookup =  xformTex2D(specular_intensity_texture, UV, specular_intensity_texture_matrix);
		float specAlpha = texLookup.a*material.le_params[1];
		materialSpecularColor = mix(material.Ks.rgb, texLookup.rgb, specAlpha);
#endif

#ifdef ENABLE_AGFDiffuseMap
		texLookup = xformTex2D(diffuse_texture, UV, diffuse_texture_matrix);
		materialDiffuseColor = mix(materialBaseColor, texLookup.rgb, texLookup.a);
#endif
		if (refraction_flag[3]>0.5)
			{
			if (vertOut_Color.r > 0.0 || vertOut_Color.g > 0.0 || vertOut_Color.b > 0.0)
				materialDiffuseColor = vertOut_Color; //Show Repair Color
			}

		vec3 diffuseColor = materialDiffuseColor;
		vec3 specularColor = vec3(0, 0, 0);
		vec4 geomPointInEyeSpace = vec4(vertOut_vEye, 1.0);
	if (agf_force_flat_shading[0]>0.5)
	{
		vec3 _zero_offsetPointEyeSpace = geomPointInEyeSpace.xyz;
		vec3 _zero_dxPES = dFdx(_zero_offsetPointEyeSpace);
		vec3 _zero_dyPES = dFdy(_zero_offsetPointEyeSpace);
		vec3 _zero_slopeNormal = cross(_zero_dxPES, _zero_dyPES);
		vec3 flatNormal = normalize(_zero_slopeNormal);
		if (dot(flatNormal, newNormal)<0.0);
			flatNormal = -flatNormal;
		newNormal = flatNormal;
	} 

//###################################################### NORMAL MAP/BUMP MAP CALCULATION (NORMAL ALTERATION) ##############################################
//Tangential basis. Needs to be there for bump maps and/or tangent-space normal maps

		vec3 _t = normalize(vertOut_t);
		vec3 _n = normalize(vertOut_n);
		vec3 _b = normalize(vertOut_b);

#ifdef ENABLE_AGFNormalMap
		//We will make sure that normal mapping and bump mapping cannot be enabled simultaneously
		//vec4 normalMapLookup = tex2D(normal_map_texture, interpolant.fTexCoord0.xy);
		vec4 normalMapLookup = xformTex2D(normal_map_texture, UV, normal_map_texture_matrix);
		normalMapLookup.xyz = (normalMapLookup.xyz-vec3(0.49803921568, 0.49803921568, 0.49803921568))*2.00787401577;
		float normalMapAlpha = normalMapLookup.a*bumpNormalPreviewFlags[1];
		normalMapLookup.a = 0.0;
		//Normal maps are now tangential
		vec3 tangentSpaceNormal = normalMapLookup.xyz;
		vec3 eyeSpaceNormal;
		eyeSpaceNormal.x = _t.x * tangentSpaceNormal.x + _b.x * tangentSpaceNormal.y + _n.x * tangentSpaceNormal.z;
		eyeSpaceNormal.y = _t.y * tangentSpaceNormal.x + _b.y * tangentSpaceNormal.y + _n.y * tangentSpaceNormal.z;
		eyeSpaceNormal.z = _t.z * tangentSpaceNormal.x + _b.z * tangentSpaceNormal.y + _n.z * tangentSpaceNormal.z;

		if (dot(tangentSpaceNormal, tangentSpaceNormal)<2.5)//White color in normal maps disables it
			{
			newNormal = mix(newNormal, normalize(eyeSpaceNormal), normalMapAlpha);
			}
#endif

		vec3 bumpGradient=vec3(0.0, 0.0, 0.0);
#ifdef ENABLE_AGFBumpMap
		//vec4 bumpLookup = tex2D(bump_gradient_texture, interpolant.fTexCoord0.xy);
		vec4 bumpLookup = xformTex2D(bump_gradient_texture, UV, bump_gradient_texture_matrix);
#ifdef AGF_BUMP_2
		float offset = 0.0;
		float fMaxOffset = agf_bump_2_params[0];
		float fMinOffset = agf_bump_2_params[1];
		offset = mix(fMinOffset, fMaxOffset, bumpLookup.x);
		vec3 offsetPointEyeSpace = geomPointInEyeSpace.xyz-normalize(newNormal)*offset*bumpLookup.a*bumpNormalPreviewFlags[0];
		vec3 zero_offsetPointEyeSpace = geomPointInEyeSpace.xyz;


		vec3 dxPES = dFdx(offsetPointEyeSpace)/length(dFdx(zero_offsetPointEyeSpace));
		vec3 dyPES = dFdy(offsetPointEyeSpace)/length(dFdy(zero_offsetPointEyeSpace));
		vec3 slopeNormal = cross(dxPES, dyPES);
		
		vec3 zero_dxPES = dFdx(zero_offsetPointEyeSpace)/length(dFdx(zero_offsetPointEyeSpace));
		vec3 zero_dyPES = dFdy(zero_offsetPointEyeSpace)/length(dFdx(zero_offsetPointEyeSpace));
		vec3 zero_slopeNormal = cross(zero_dxPES, zero_dyPES);
		
		vec3 normalDelta = slopeNormal-zero_slopeNormal;
		newNormal = normalize(newNormal+normalDelta);
		bumpGradient = vec3(0.0, 0.0, 0.0);
#else
		float x0,x1,y0,y1;
		x0 = xformTex2DOffset(bump_gradient_texture, UV, bump_gradient_texture_matrix, -bumpTextureNormalizer*vec4(1.0, 0.0, 0.0, 0.0)).r;
		x1 = xformTex2DOffset(bump_gradient_texture, UV, bump_gradient_texture_matrix, +bumpTextureNormalizer*vec4(1.0, 0.0, 0.0, 0.0)).r;
		y0 = xformTex2DOffset(bump_gradient_texture, UV, bump_gradient_texture_matrix, -bumpTextureNormalizer*vec4(0.0, 1.0, 0.0, 0.0)).r;
		y1 = xformTex2DOffset(bump_gradient_texture, UV, bump_gradient_texture_matrix, +bumpTextureNormalizer*vec4(0.0, 1.0, 0.0, 0.0)).r;
		bumpGradient.xyz = vec3(-(x1-x0)*unscaledIBLColor.a, -(y1-y0)*unscaledIBLColor.a, 0);
		bumpGradient.xyz = bumpGradient.xyz*(bumpStrength*2.0*bumpLookup.a*bumpNormalPreviewFlags[0]);
#endif
#endif

		vec2 noiseBumpGradient = vec2(0.0, 0.0);
#ifdef HAS_VOLUME_BUMP_NOISE
//NoiseBump 
		vec4 geomPointInBBOXSpace = iEyeToNormalizedBBOXMatrix*geomPointInEyeSpace;
		vec4 params;
		params.x = volumeNoiseBumpParams[0];
		params.y = volumeNoiseBumpParams[1];
		params.z = 3.0;
		params.w = 0.0;
		float duValue = PerlinNoise3D(volumeNoiseTexture, volumeNoiseBumpParams[2]*geomPointInBBOXSpace.xyz, params);
		float dvValue = PerlinNoise3D(volumeNoiseTexture, volumeNoiseBumpParams[2]*geomPointInBBOXSpace.xyz+vec3(0.7, 0.7, 0.7), params);
	    noiseBumpGradient = volumeNoiseBumpParams[3]*vec2(duValue-0.5, dvValue-0.5); //
if (agf_force_flat_shading[0]>0.5)
{
       _t=vec3(1.0, 0.0, 0.0);
       _b=vec3(0.0, 1.0, 0.0);
}
//gl_FragColor = vec4(duValue, dvValue, 1.0, 1.0);
//return;
#endif

		bumpGradient.xy = noiseBumpGradient+bumpGradient.xy;
		vec3 normalDistortionTangentSpace = bumpGradient; //Alpha channel used to modulate bump strength
		vec3 normalDistortionEyeSpace;
		normalDistortionEyeSpace.x = _t.x * normalDistortionTangentSpace.x + _b.x * normalDistortionTangentSpace.y;
		normalDistortionEyeSpace.y = _t.y * normalDistortionTangentSpace.x + _b.y * normalDistortionTangentSpace.y;
		normalDistortionEyeSpace.z = _t.z * normalDistortionTangentSpace.x + _b.z * normalDistortionTangentSpace.y;
		newNormal = normalize(newNormal + normalDistortionEyeSpace);


	//Determine if triangle is front/back facing
	if (gl_FrontFacing)//back-facing condition check
	   {
	   newNormal = -newNormal;
	   }
else
	   {
	   newNormal = newNormal;
	   }


//###################################################### END OF NORMAL ALTERATION ##############################################


//###################################################### CALCULATION OF THE SPECULAR EXPONENT  #################################
float shininess = material.shininess;		
#ifdef ENABLE_AGFSpecularExponentMap
		//texLookup = tex2D(specular_exponent_texture, interpolant.fTexCoord0.xy);
		texLookup = xformTex2D(specular_exponent_texture, UV, specular_exponent_texture_matrix);
		shininess = mix(material.shininess, (1.0+180.0*texLookup.r), texLookup.a);
#endif

vec3	materialAdjustedRoughnessSpecularColor = materialSpecularColor;


//###################################################### ADJUSTMENT OF THE SPECULAR COLOR BASED ON ROUGHNESS VALUE  #############

#ifdef ENABLE_ROUGHNESS
float roughnessValue = roughness.r;
#ifdef ENABLE_AGFRoughnessMap
		texLookup = xformTex2D(roughness_texture, UV,roughness_texture_matrix);
		roughnessValue = mix(roughness.r, texLookup.r, texLookup.a); 
#endif
	roughnessValue = roughnessValue*0.5;
	
	float roughnessSigma = roughnessValue;
	float phongSigma = acos(exp(-1.0/(2.0*shininess)));
	float newSigma = sqrt(phongSigma*phongSigma+roughnessSigma*roughnessSigma);
	shininess = (-1.0/(2.0*log(cos(newSigma))));
	float specColorFadeout = phongSigma/newSigma;
	float specColorFadeoutSquared = specColorFadeout*specColorFadeout;
	vec3  specColorFadeout3 = vec3(specColorFadeoutSquared, specColorFadeoutSquared, specColorFadeoutSquared);
	materialAdjustedRoughnessSpecularColor = materialSpecularColor*specColorFadeout3;
#endif

//############################################# DIRECT LIGHTING/SHADOWS CALCULATIONS #################################################
		vec3 diff = vec3(0.0, 0.0, 0.0);
#ifdef ENABLE_LIGHTING
		vec3 spec = vec3(0.0, 0.0, 0.0);
		int i=0;
		vec3 diffNoShadowDummy=vec3(0.0, 0.0, 0.0);
		float screenSpaceRandomNumber=0.0;

#if NUMBER_OF_ACTIVE_INFINITE_LIGHTS > 0
		for (i=0;i<NUMBER_OF_ACTIVE_INFINITE_LIGHTS;i++)
			{
			//infiniteLights[i].position = fmodelViewCamera * infiniteLights[i].position;	
			InfiniteLight transformedLight;
			transformedLight = infiniteLights[i];
			transformedLight.position = fmodelViewCamera * infiniteLights[i].position;	
			EvaluateInfiniteLight(newNormal, -(vertOut_vEye), transformedLight, diff, spec, diffNoShadowDummy, shininess,iEyeToWorldMatrix,screenSpaceRandomNumber);
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
			EvaluateSpotLight(newNormal, -(vertOut_vEye), transformedLight, diff, spec, diffNoShadowDummy, shininess,iEyeToWorldMatrix,screenSpaceRandomNumber);
			}
#endif
#if NUMBER_OF_ACTIVE_POINT_LIGHTS > 0
		for (i=0;i<NUMBER_OF_ACTIVE_POINT_LIGHTS;i++)
			{
			PointLight transformedLight;

			transformedLight = pointLights[i];
			transformedLight.worldPosition = pointLights[i].position;
			transformedLight.position = fmodelViewCamera * pointLights[i].position;	
			EvaluatePointLight(newNormal, -(vertOut_vEye), transformedLight, diff, spec, diffNoShadowDummy, shininess,iEyeToWorldMatrix,screenSpaceRandomNumber);
			}
#endif
#ifdef FORCE_DIFFUSE_NO_SHADOWS

	diff = diffNoShadowDummy;

#else


#endif
		diff = diff*material.le_params[2];//exposure
		spec = spec*material.le_params[2];//exposure
		//Ambient term should be added here, but since our ambient light component is always 0, we skip it
		diffuseColor.rgb = (diff+material.Ke.rgb)*materialDiffuseColor;
		specularColor.rgb = material.le_params[3]*materialAdjustedRoughnessSpecularColor*spec;
#endif

#ifdef ZERO_LIGHTS
		//Special case for full-shaded mode with zero lights
		diffuseColor.rgb = (material.Ke.rgb)*materialDiffuseColor;
		specularColor.rgb = vec3(0.0, 0.0, 0.0);
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
		vec3   diffuse_intensity =  materialDiffuseColor ;
		iblDiffuseOnly = vec3(	dot(normalIBL, (sphericalHarmonicMatrixRed*normalIBL)),
								dot(normalIBL, (sphericalHarmonicMatrixGreen*normalIBL)), 
								dot(normalIBL, (sphericalHarmonicMatrixBlue*normalIBL)) );
 		vec3 diffuseIBL = diffuse_intensity * iblDiffuseOnly;
 		//diffuseIBL = texSPHERE(IBLTexture, normalIBL.xyz).rgb; //For Debugging env. orientation only - use tex sample instead of spherical harmonic
		diffuseColor.rgb += diffuseIBL;
#endif

if (material.selfillum.a < 0.5)
	{
		//ALBEDO-only mode
		diffuseColor.rgb = materialDiffuseColor;
		specularColor.rgb = vec3(0.0, 0.0, 0.0);
	}
if (material.selfillum.a == 2.0)
	{
		//Diffuse-lighting-only mode
		diffuseColor.rgb = diff+material.Ke.rgb+iblDiffuseOnly;
		specularColor.rgb = vec3(0.0, 0.0, 0.0);
	}
	
	finalColor.rgb = diffuseColor.rgb+specularColor.rgb;
	finalColor.a = material.opacity;

#if defined(ENVIRONMENT_PASS_SHADER) || defined(OPACITY_SELF_ILLUM_PASS_SHADER)
	finalColor = vec4(0.0, 0.0, 0.0, 1.0);
#endif



//############################################# ENVIRONMENT MAPPING + IBL SPECULAR HIGHLIGHTS #################################################

vec4 reflColor = environmentColor;
vec4 iblSpecularHighlightsContribution = vec4(0.0, 0.0, 0.0, 0.0);

		//Update the reflection vector
		vec4 t_reflect;
		vec3 reflectionVector;
		if (agf_force_flat_shading[1]>0.5)
			t_reflect.xyz = reflect(vec3(0, 0, -1), newNormal); //Parallel Projection 
		else
			t_reflect.xyz = reflect(normalize(vertOut_vPosition.xyz), newNormal); //Perspective Projection
		t_reflect.w = 0.0;
#ifdef ENABLE_AGFSphereEnvironmentMap

		reflectionVector = (reflectionTransformationMatrix * t_reflect).xyz;
		texLookup = texSPHERE(environment_texture,environment_texture_matrix, reflectionVector);
		reflColor.rgb = mix(unscaledIBLColor.rgb, texLookup.rgb, texLookup.a);
		//reflColor.rgb = vec3(0, 0, 0);
		
		float texStep = 1.0/16.0;
		float texOffset = 1.0/(16.0*2.0);
#ifdef ENABLE_ADVANCED_REFRACTION_REFLECTION
#ifdef ENABLE_IBL_SPECULAR_HIGHLIGHTS

		vec3 minShinyColor;
		vec3 maxShinyColor;
		vec3 mediumShinyColor;

		texLookup=texSPHEREMULTI(discreteShininess3DTex, environment_texture_matrix, vec4(1.0/9.0, 1.0/9.0, 2.0*texStep+texOffset, 1.0), reflectionVector);
		minShinyColor = mix(environmentColor.rgb, texLookup.rgb, texLookup.a);

		texLookup=texSPHEREMULTI(discreteShininess3DTex, environment_texture_matrix, vec4(1.0/1.0, 1.0/1.0, 0.0*texStep+texOffset, 1.0), reflectionVector);
		maxShinyColor = mix(environmentColor.rgb, texLookup.rgb, texLookup.a);

		texLookup=texSPHEREMULTI(discreteShininess3DTex, environment_texture_matrix, vec4(1.0/3.0, 1.0/3.0, 1.0*texStep+texOffset, 1.0), reflectionVector);
		mediumShinyColor = mix(environmentColor.rgb, texLookup.rgb, texLookup.a);

		float lt = 0.0;
		
		if (shininess<20.0)
			{
			lt = shininess/20.0;
			iblSpecularHighlightsContribution.rgb = mix(minShinyColor, mediumShinyColor, lt);
			}
		else
			{
			lt = (shininess-20.0)/492.0;
			iblSpecularHighlightsContribution.rgb = mix(mediumShinyColor, maxShinyColor, lt);
			} 
		iblSpecularHighlightsContribution.rgb = iblSpecularHighlightsContribution.rgb*materialSpecularColor.rgb*iGlobalAmbientColor.a;
		iblSpecularHighlightsContribution.a = 0.0;
#endif
		
		
#ifdef ENABLE_ROUGHNESS
		vec4 color0 = reflColor.rgba;
		vec4 color1 = texSPHEREMULTI(discreteShininess3DTex, environment_texture_matrix, vec4(1.0, 1.0, 3.0*texStep+texOffset, 1.0), reflectionVector);
		float t = roughnessValue/0.1;
		vec4 roughReflectionColor = mix(color0, color1, t);
 		if (roughnessValue>0.1)
 			{
 			float texZ;
 			t = (roughnessValue-0.1)/0.9;
 			texZ = mix(3.0*texStep+texOffset, 12.0*texStep+texOffset, t);
 			roughReflectionColor = texSPHEREMULTI(discreteShininess3DTex, environment_texture_matrix, vec4(1.0/1.0, 1.0, texZ, 1.0), reflectionVector);
 			}
		
		reflColor.rgb = roughReflectionColor.rgb;
#endif
		
#endif
		
		
#endif
		reflColor.a = 0.0;

//############################################# ADJUSTING reflColor with REFLECTIVITY VALUE #################################################

		vec3 materialReflectivity3 = vec3(material.reflectivity);
#ifdef ENABLE_AGFReflectivityMap
		vec3 reflectivity;		
		texLookup = xformTex2D(reflectivity_texture, UV,reflectivity_texture_matrix);
		reflectivity = mix(materialReflectivity3, texLookup.rgb, texLookup.a); //Default reflectivity is non-reflective, for now
		reflColor.rgb = reflColor.rgb*reflectivity;
#else
		reflColor.rgb = reflColor.rgb*materialReflectivity3;
#endif

if (material.selfillum.a < 1.5)
	{
   //Do not add reflections for lighting-only mode
	finalColor = finalColor + reflColor + iblSpecularHighlightsContribution;
	}

//########################################## ADDING SELF-ILLUMINATION ########################################################################		
#ifdef ENABLE_AGFSelfIlluminationMap
		vec4 selfIlluminationColor;
		selfIlluminationColor = xformTex2D(self_illumination_texture, UV, self_illumination_texture_matrix).rgba;
		vec3 rescaledSelfIlluminationColor;
		rescaledSelfIlluminationColor.r = mix(self_illumination_texture_range[0],self_illumination_texture_range[1], selfIlluminationColor.r);
		rescaledSelfIlluminationColor.g = mix(self_illumination_texture_range[0],self_illumination_texture_range[1], selfIlluminationColor.g);
		rescaledSelfIlluminationColor.b = mix(self_illumination_texture_range[0],self_illumination_texture_range[1], selfIlluminationColor.b);
		vec3 blendedSelfIlluminationColor = mix(material.selfillum.rgb,rescaledSelfIlluminationColor.rgb, selfIlluminationColor.a);
		finalColor.rgb = finalColor.rgb + blendedSelfIlluminationColor;
#else
		finalColor.rgb = finalColor.rgb + material.selfillum.rgb;
#endif
		//float opacity = mainColor.a;





//########################################## REFRACTION #####################################################################################		
#ifdef ENABLE_ADVANCED_REFRACTION_REFLECTION
		if (refraction_flag[0]>0.5)
		{
		vec3 refractedRay;
		vec4 t_refract; 
		t_refract.xyz = refract(normalize(vertOut_vPosition.xyz), newNormal, 1.0/material.ior);
		t_refract.w = 0.0;
		refractedRay = (refractionTransformationMatrix * t_refract).xyz;
		vec4 refractedColor;
		refractedColor = texSPHERE(background_texture,background_texture_matrix, refractedRay);
		finalColor.rgb = mix(refractedColor.rgb, finalColor.rgb, opacity);
		finalColor.a = refractedColor.a;
		}
#endif


//########################################## FINAL PROCESSING ################################################################################		

		finalColor.a = finalOpacity;

#ifdef ENABLE_ALPHA_PREMULTIPLY
		finalColor.rgb = finalColor.rgb*finalColor.a;
#endif

#if 0
 //Testing the noise function
		vec4 geomPointInEyeSpace = vec4(vertOut_vEye, 1.0);
		vec4 geomPointInBBOXSpace = iEyeToNormalizedBBOXMatrix*geomPointInEyeSpace;
		vec3 params;
		params.x = 2.0;//material.reflectivity*4.0;
		params.y = 1.8;//material.opacity*4.0;
		params.z = 3.0;
		float noiseValue = PerlinNoise3D(volumeNoiseTexture, 5.0*geomPointInBBOXSpace.xyz, params);
		finalColor.rgb = vec3(noiseValue, noiseValue, noiseValue);
		finalColor.a = 1.0;
#endif

//	float noiseTest = crand(gl_FragCoord.xy);
//	finalColor.rgb = vec3(noiseTest, noiseTest, noiseTest);

#ifdef FORCE_DIFFUSE_NO_SHADOWS

	gl_FragColor.rgb = diffuseColor.rgb;
	gl_FragColor.a = 1.0;

#else

	gl_FragColor = finalColor;

#endif

}
