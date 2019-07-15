
//agf_include "main_shared_functions_fragment.glsl"

//agf_include "main_vertex2fragment.glsl"




uniform Material	material;
uniform vec4		clippingPlane;

uniform sampler2D	object_opacity_texture;
uniform mat4x4      object_opacity_texture_matrix;
uniform vec4		refraction_flag;
uniform vec4        meshShadowOpacity;

void main()
{
    vec4 UV = vertOut_fTexCoord0;
	vec4 texLookup; //Temporary variable
	float clipSign = dot(clippingPlane.xyz, vertOut_vPosition.xyz)+clippingPlane.w;
	if (clipSign < 0) discard;
	
	float opacity=material.opacity;

#ifdef	ENABLE_AGFOpacityMap
		texLookup = xformTex2D(object_opacity_texture, UV, object_opacity_texture_matrix);		
#ifdef USE_ALPHA_FOR_OPACITY_MAP
		opacity = texLookup.a;
#else
		vec3 perColorOpacity = texLookup.rgb*texLookup.a*opacity; //multiplying texture value times base value, not lerp(material.opacity.rrr, texLookup.rgb, texLookup.a);
		//We have got to choose _SINGLE_ opacity value for GL framebuffer
		//We are choosing maximum of the 3
		float rg_maxopacity = max (perColorOpacity.r, perColorOpacity.g);
		opacity = max (rg_maxopacity, perColorOpacity.b); 
#endif
#endif
	
	float heisenbergShading = 0.5;

	heisenbergShading = rand(vertOut_fClipPosition.xy+vertOut_vPosition.zz);

	
	opacity = opacity*meshShadowOpacity.r;
	
if (refraction_flag[1]>=0.0)
	{
	if (opacity < refraction_flag[1])
		discard;
	else
		opacity = 1.0;
	}
else
	{
	if (opacity<heisenbergShading)
		discard;
	}
    gl_FragColor = vec4(opacity, opacity, opacity, opacity);

}


//#define STOCHASTIC_SHADOW_TRANSPARENCY	
//frag2buffer shadowCasterMain(in vertex2frag interpolant
//							,uniform Material	material
//							,uniform vec4x4	modelViewIT
//							,uniform vec4		clippingPlane
//							,uniform sampler2D	noiseTexture
//							,uniform sampler2D	object_opacity_texture
//							,uniform vec4x4	object_opacity_texture_matrix
//							,uniform vec2		refraction_flag
//							,uniform vec4     meshShadowOpacity
//
//)
//{
//	vec4 UV = interpolant.fTexCoord0;
//	vec4 texLookup; //Temporary variable
//	float clipSign = dot(clippingPlane.xyz, interpolant.vPosition.xyz)+clippingPlane.w;
//	if (clipSign < 0) discard;
//	
//	float opacity=material.opacity;
//
//#ifdef	ENABLE_AGFOpacityMap
//		texLookup = xformTex2D(object_opacity_texture, UV, object_opacity_texture_matrix);		
//#ifdef USE_ALPHA_FOR_OPACITY_MAP
//		opacity = texLookup.a;
//#else
//		vec3 perColorOpacity = texLookup.rgb*texLookup.a*opacity; //multiplying texture value times base value, not lerp(material.opacity.rrr, texLookup.rgb, texLookup.a);
//		//We have got to choose _SINGLE_ opacity value for GL framebuffer
//		//We are choosing maximum of the 3
//		float rg_maxopacity = max (perColorOpacity.r, perColorOpacity.g);
//		opacity = max (rg_maxopacity, perColorOpacity.b); 
//#endif
//#endif
//	
//	float heisenbergShading = 0.5;
//#ifdef STOCHASTIC_SHADOW_TRANSPARENCY	
//	vec3 clipNormalized;
//	clipNormalized = (interpolant.fClipPosition.xyz+vec3(1.0, 1.0, 1.0))*vec3(0.5, 0.5, 0.5);
//	vec2 normTexLookup = clipNormalized.xy + clipNormalized.zz;
//	vec4 noiseVal = tex2D(noiseTexture,normTexLookup);
//	heisenbergShading = noiseVal.r;
//#endif
//	
//	opacity = opacity*meshShadowOpacity.r;
//	
//if (refraction_flag[1]>=0.0)
//	{
//	if (opacity < refraction_flag[1])
//		discard;
//	else
//		opacity = 1.0;
//	}
//else
//	{
//	if (opacity<heisenbergShading)
//		discard;
//	}
//	gl_FragColor = vec4(opacity, opacity, opacity, opacity);
//}
