//agf_include "main_shared_functions_fragment.glsl"

//agf_include "main_vertex2fragment.glsl"



uniform sampler2D	normal_map_texture;
uniform mat4		normal_map_texture_matrix;

uniform sampler2D	bump_gradient_texture;
uniform mat4		bump_gradient_texture_matrix;
uniform vec4		bumpTextureNormalizer;
uniform float		bumpStrength;



uniform vec4 clippingPlane;

void main()
{
    float clipSign = dot(clippingPlane.xyz, vertOut_vPosition.xyz)+clippingPlane.w;
    if (clipSign < 0.0) discard;
    
    
    vec3 newNormal = normalize(vertOut_vNormal);
    vec4 UV = vertOut_fTexCoord0;

    
    vec3 _t = normalize(vertOut_t);
    vec3 _n = normalize(vertOut_n);
    vec3 _b = normalize(vertOut_b);
//
//#ifdef ENABLE_AGFNormalMap
//    //We will make sure that normal mapping and bump mapping cannot be enabled simultaneously
//    //vec4 normalMapLookup = tex2D(normal_map_texture, interpolant.fTexCoord0.xy);
//    vec4 normalMapLookup = xformTex2D(normal_map_texture, UV, normal_map_texture_matrix);
//    normalMapLookup.xyz = (normalMapLookup.xyz-vec3(0.49803921568, 0.49803921568, 0.49803921568))*2.00787401577;
//    float normalMapAlpha = normalMapLookup.a*bumpNormalPreviewFlags[1];
//    normalMapLookup.a = 0.0;
//    //Normal maps are now tangential
//    vec3 tangentSpaceNormal = normalMapLookup.xyz;
//    vec3 eyeSpaceNormal;
//    eyeSpaceNormal.x = _t.x * tangentSpaceNormal.x + _b.x * tangentSpaceNormal.y + _n.x * tangentSpaceNormal.z;
//    eyeSpaceNormal.y = _t.y * tangentSpaceNormal.x + _b.y * tangentSpaceNormal.y + _n.y * tangentSpaceNormal.z;
//    eyeSpaceNormal.z = _t.z * tangentSpaceNormal.x + _b.z * tangentSpaceNormal.y + _n.z * tangentSpaceNormal.z;
//    
//    if (dot(tangentSpaceNormal, tangentSpaceNormal)<2.5)//White color in normal maps disables it
//    {
//        newNormal = mix(newNormal, normalize(eyeSpaceNormal), normalMapAlpha);
//    }
//#endif
//    
    vec3 bumpGradient=vec3(0.0, 0.0, 0.0);

     vec4 bumpLookup = xformTex2D(bump_gradient_texture, UV, bump_gradient_texture_matrix);
    float x0,x1,y0,y1;
    x0 = xformTex2DOffset(bump_gradient_texture, UV, bump_gradient_texture_matrix, -bumpTextureNormalizer*vec4(1.0, 0.0, 0.0, 0.0)).r;
    x1 = xformTex2DOffset(bump_gradient_texture, UV, bump_gradient_texture_matrix, +bumpTextureNormalizer*vec4(1.0, 0.0, 0.0, 0.0)).r;
    y0 = xformTex2DOffset(bump_gradient_texture, UV, bump_gradient_texture_matrix, -bumpTextureNormalizer*vec4(0.0, 1.0, 0.0, 0.0)).r;
    y1 = xformTex2DOffset(bump_gradient_texture, UV, bump_gradient_texture_matrix, +bumpTextureNormalizer*vec4(0.0, 1.0, 0.0, 0.0)).r;
    bumpGradient.xyz = vec3(-(x1-x0), -(y1-y0), 0);
    bumpGradient.xyz = bumpGradient.xyz*(bumpStrength*2.0*bumpLookup.a);
//
//    vec2 noiseBumpGradient = vec2(0.0, 0.0);
//#ifdef HAS_VOLUME_BUMP_NOISE
//    //NoiseBump
//    vec4 geomPointInBBOXSpace = iEyeToNormalizedBBOXMatrix*geomPointInEyeSpace;
//    vec4 params;
//    params.x = volumeNoiseBumpParams[0];
//    params.y = volumeNoiseBumpParams[1];
//    params.z = 3.0;
//    params.w = 0.0;
//    float duValue = PerlinNoise3D(volumeNoiseTexture, volumeNoiseBumpParams[2]*geomPointInBBOXSpace.xyz, params);
//    float dvValue = PerlinNoise3D(volumeNoiseTexture, volumeNoiseBumpParams[2]*geomPointInBBOXSpace.xyz+vec3(0.7, 0.7, 0.7), params);
//    noiseBumpGradient = volumeNoiseBumpParams[3]*vec2(duValue-0.5, dvValue-0.5); //
//    if (agf_force_flat_shading[0]>0.5)
//    {
//        _t=vec3(1.0, 0.0, 0.0);
//        _b=vec3(0.0, 1.0, 0.0);
//    }
//    //gl_FragColor = vec4(duValue, dvValue, 1.0, 1.0);
//    //return;
//#endif
//    
//    bumpGradient.xy = noiseBumpGradient+bumpGradient.xy;
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

    gl_FragColor.rgb = (normalize(newNormal)+vec3(1, 1, 1))*vec3(0.5, 0.5, 0.5);
    gl_FragColor.a = 1.0;
    
}

//frag2buffer uvFragMain(in vertex2frag interpolant, ",
//                       "						   uniform sampler2D bump_gradient_texture, ",
//                       "						   uniform float2 bumpTextureNormalizer, ",
//                       "						   uniform float bumpStrength,",
//                       "						   uniform float4 clippingPlane",
//                       "						   )",
//                       "	{",
//                       "	frag2buffer fragOut;",
//                       "	float clipSign = dot(clippingPlane.xyz, interpolant.fPosition.xyz)+clippingPlane.w;",
//                       "	if (clipSign < 0) discard;",
//                       "	float3 newNormal = interpolant.fNormal.xyz;",
//                       "if (bumpTextureNormalizer.x < 0.5 && length(interpolant._t)>0)//This means width of bump texture is > 2 -> bumps exist",
//                       "	{",
//                       "	float4 bumpLookup = tex2D(bump_gradient_texture, interpolant.fTexCoord0.xy);",
//                       "	float3 bumpGradient;",
//                       "	float x0,x1,y0,y1;",
//                       "	x0 = tex2D(bump_gradient_texture, interpolant.fTexCoord0.xy-bumpTextureNormalizer*float2(1.0, 0.0)).r;",
//                       "	x1 = tex2D(bump_gradient_texture, interpolant.fTexCoord0.xy+bumpTextureNormalizer*float2(1.0, 0.0)).r;",
//                       "	y0 = tex2D(bump_gradient_texture, interpolant.fTexCoord0.xy-bumpTextureNormalizer*float2(0.0, 1.0)).r;",
//                       "	y1 = tex2D(bump_gradient_texture, interpolant.fTexCoord0.xy+bumpTextureNormalizer*float2(0.0, 1.0)).r;",
//                       "	bumpGradient.xyz = float3(-(x1-x0), -(y1-y0), 0);",
//                       "	float3 normalDistortionTangentSpace = bumpGradient.xyz*2.0*bumpStrength*bumpLookup.a; //Alpha channel used to modulate bump strength",
//                       "	float3 normalDistortionEyeSpace;",
//                       "	float3 _t = normalize(interpolant._t);",
//                       "	float3 _n = normalize(interpolant._n);",
//                       "	float3 _b = normalize(cross(_n, _t));",
//                       "	normalDistortionEyeSpace.x = _t.x * normalDistortionTangentSpace.x + _t.x * normalDistortionTangentSpace.y;",
//                       "	normalDistortionEyeSpace.y = _t.y * normalDistortionTangentSpace.x + _t.y * normalDistortionTangentSpace.y;",
//                       "	normalDistortionEyeSpace.z = _t.z * normalDistortionTangentSpace.x + _t.z * normalDistortionTangentSpace.y;",
//                       "	newNormal = newNormal + normalDistortionEyeSpace;",
//                       "	}",
//                       "	fragOut.color.rgb = (normalize(newNormal)+float3(1, 1, 1))*float3(0.5, 0.5, 0.5);",
//                       "	fragOut.color.a = 1.0;",
//                       "	return  fragOut;",
//                       "	}",
