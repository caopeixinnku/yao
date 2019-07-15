
//agf_include "main_shared_functions_fragment.glsl"

//agf_include "main_vertex2fragment.glsl"


#ifdef ENABLE_AGFDiffuseMap
uniform sampler2D	diffuse_texture;
uniform mat4		diffuse_texture_matrix;
#endif
uniform vec4 constantColor;
uniform vec4 clippingPlane;
uniform vec4 extraReflectionClippingPlane;
uniform vec4 refraction_flag; 
uniform vec4 useVertexForBase; 
uniform Material	material;
void main()
{
		vec4 UV = vertOut_fTexCoord0;
       vec3 materialBaseColor = material.Kd.rgb;
		if (useVertexForBase[0]>0.5)
			{
			materialBaseColor = vertOut_Color.rgb; //Show Repair Color
			}
       vec3 materialDiffuseColor = materialBaseColor;
       float materialDiffuseOpacity = 1.0;
		vec4 texLookup = vec4(0.0, 0.0, 0.0, 0.0); //Temporary variable, to use in all the texture Lookups
#ifdef ENABLE_AGFDiffuseMap
		texLookup = xformTex2D(diffuse_texture, UV, diffuse_texture_matrix);
        if (useVertexForBase[1]>0.5) //The fRenderStatePtr->currentRenderSettings.blendUnlitWithBaseValue is passed here
            {
            materialDiffuseColor = mix(materialBaseColor, texLookup.rgb, texLookup.a);
            }
        else
            {
            materialDiffuseColor = texLookup.rgb;
            materialDiffuseOpacity = texLookup.a;
            }
#endif
		vec4 finalColor;
        finalColor.rgb = materialDiffuseColor.rgb;
        finalColor.a = materialDiffuseOpacity;

//########################################## CLIPPING PLANES ################################################################################		

		float clipSign = dot(clippingPlane.xyz, vertOut_vPosition.xyz)+clippingPlane.w;
		if (clipSign < 0.0) discard;

		float extraClipSign = dot(extraReflectionClippingPlane.xyz, vertOut_vPosition.xyz)+extraReflectionClippingPlane.w;
		if (extraClipSign < 0.0) discard;

//########################################## FINAL PROCESSING ################################################################################		

		if (finalColor.a == 0.0) discard;

#ifdef ENABLE_ALPHA_PREMULTIPLY
        if (useVertexForBase[1]>0.5) //The fRenderStatePtr->currentRenderSettings.blendUnlitWithBaseValue is passed here
            {
            finalColor.rgb = finalColor.rgb*finalColor.a;
            }
#endif


	gl_FragColor = finalColor;
}
