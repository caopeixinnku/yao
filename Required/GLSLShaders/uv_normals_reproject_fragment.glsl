//agf_include "core_fragment.glsl"

//agf_include "vertex2fragment_uv2_tbn.glsl"

uniform sampler2D	bumpMap;
uniform mat4		bump_gradient_texture_matrix;
uniform sampler2D	normalMap;
uniform mat4		normal_map_texture_matrix;
uniform vec4		bumpFloats;
// bumpFloats[0]  - flag whether to use the normal map 
// bumpFloats[1]  - bumpStrentgh 
// bumpFloats[2]  - bumpTextureNormalizerU 
// bumpFloats[3]  - bumpTextureNormalizerV


void main() 
{ 
	vec3 tangentSpaceBaseNormal = vec3(0.0, 0.0, 1.0);
	float useNormalMap =  bumpFloats[0];
	vec2 bumpTextureNormalizer =  bumpFloats.zw;
	float bumpStrength = bumpFloats[1];
	vec4 tex_coord = vec4(vertOut_UV.x, vertOut_UV.y, 0.0, 1.0);
	vec3 tangentSpaceNormal = vec3(0.0, 0.0, 1.0);
	if (useNormalMap > 0.5)
		{
		vec4 texLookup =  xformTex2D(normalMap, tex_coord, normal_map_texture_matrix);
		vec3 mapNormal = (texLookup.xyz-vec3(0.5, 0.5, 0.5))*2.0;
		tangentSpaceNormal = normalize(mix(tangentSpaceBaseNormal, mapNormal, texLookup.w));
		}
	vec3 bumpGradient;
	float x0,x1,y0,y1;
	float bumpAlpha = xformTex2D(bumpMap, tex_coord, bump_gradient_texture_matrix).a; 
	x0 = xformTex2DOffset(bumpMap, tex_coord, bump_gradient_texture_matrix, -bumpTextureNormalizer*vec2(1.0, 0.0)).r; 
	x1 = xformTex2DOffset(bumpMap, tex_coord, bump_gradient_texture_matrix, +bumpTextureNormalizer*vec2(1.0, 0.0)).r; 
	y0 = xformTex2DOffset(bumpMap, tex_coord, bump_gradient_texture_matrix, -bumpTextureNormalizer*vec2(0.0, 1.0)).r; 
	y1 = xformTex2DOffset(bumpMap, tex_coord, bump_gradient_texture_matrix, +bumpTextureNormalizer*vec2(0.0, 1.0)).r; 
	bumpGradient.xyz = vec3(-(x1-x0), -(y1-y0), 0.0);
	bumpGradient.xyz = bumpGradient.xyz * (2.0*bumpStrength*bumpAlpha);
	tangentSpaceNormal = (tangentSpaceNormal+bumpGradient);

    vec3 t = vertOut_t;
    vec3 b = vertOut_b;
    vec3 n = tangentSpaceBaseNormal;
    vec3 projectedTSN = tangentSpaceNormal;
	projectedTSN.x = t.x*tangentSpaceNormal.x+b.x*tangentSpaceNormal.y;//+n.x*tangentSpaceNormal.z;
	projectedTSN.y = t.y*tangentSpaceNormal.x+b.y*tangentSpaceNormal.y;//+n.y*tangentSpaceNormal.z;
    projectedTSN.z = t.z*tangentSpaceNormal.x+b.z*tangentSpaceNormal.y+1.0*tangentSpaceNormal.z;
	projectedTSN = normalize(projectedTSN);

	vec4 finalColor;
	finalColor.rgb = (projectedTSN+vec3(1.0, 1.0, 1.0))*vec3(0.49803921568, 0.49803921568, 0.49803921568);
	finalColor.a  = 1.0;
	gl_FragColor = finalColor;
} 