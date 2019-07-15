//agf_include "core_fragment.glsl"

//agf_include "vertex2fragment_uv2_tbn.glsl"

uniform sampler2D tex;
uniform vec4 iBaseColor;
uniform vec4 iBlendMode;
//0 :0 - mix with base color, 1 - multiply by base color
//1 :0 - nothing 1: It's opacity map and we need its alpha as opacity value (postcard opacity map case)
//2: 0 - use Base Color for base color, 1 - use vertex Color for base color 
//3: In case vertex color is used for base: 0 - blend with texture with the base color, 1 - ignore the texture data 
void main()
	{
	vec4 baseColor = iBaseColor;
	if (iBlendMode[2]>0.5)
		{
		baseColor = vertOut_Color;
		}

	vec4 tex_coord = vec4(vertOut_UV.x, vertOut_UV.y, 0.0, 1.0);
	vec4 texLookup = texture2D(tex, tex_coord.xy);
	if (iBlendMode[2]>0.5 && iBlendMode[3]>0.5)
		{
		texLookup.a = 0.0;
		}

	//For vertex-color-only mode (iBlendMode[3]), ignore the texture data completely
	vec3 blendedColor = mix(baseColor.rgb, texLookup.rgb, texLookup.a);
	if (iBlendMode[0] > 0.5 && iBlendMode[2]<0.5) 
		{
		blendedColor.rgb = texLookup.rgb*iBaseColor.rgb;
		}

	if (iBlendMode[1] > 0.5 && iBlendMode[2]<0.5) 
		{
		blendedColor.rgb = texLookup.aaa*iBaseColor.rgb;
		}

	vec4 finalColor = vec4(blendedColor.r, blendedColor.g, blendedColor.b, 1.0);

	gl_FragColor = finalColor;
	}

