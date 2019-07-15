
//agf_include "ctl_sketch_interpolants.glsl"

//agf_include "ctl_sketch_fragment_common.glsl"

uniform sampler2D SamplerDepth;
uniform sampler2D SamplerNormal;
uniform mat4x4    agf_CameraModelViewMatrixInverted;

void main()
{
    vec2 uvLookup = vertOut_fTexCoord0.xy;
    
	vec3 originalNormal = texture2D( SamplerNormal,uvLookup ).rgb;
	float originalDepth = texture2D( SamplerDepth,uvLookup ).r;

	vec3 decodedNormal =  (originalNormal - vec3(0.5))*vec3(2.0);


	vec4 eyeSpaceNormal = vec4(decodedNormal, 0);
	vec4 worldSpaceNormal = agf_CameraModelViewMatrixInverted*eyeSpaceNormal;

	//vec3 encodedWorldSpaceNormal = (worldSpaceNormal.rgb+vec3(1.0))*vec3(0.5);

	vec4 NormalAndDepth;

    NormalAndDepth.rgb = normalize(worldSpaceNormal.rgb);
    NormalAndDepth.a = originalDepth;

    gl_FragColor = NormalAndDepth;

//Debugging
//	gl_FragColor.rgb = vec3(originalDepth, originalDepth, originalDepth); //encodedWorldSpaceNormal;
//	gl_FragColor.a = 1.0;

}

//
//"frag2buffer composeFrag(in vertex2frag interpolant, 
//"			uniform sampler2D SamplerDepth,
//"			uniform sampler2D SamplerNormal,
//"			uniform vec4x4 agf_CameraModelViewMatrixInverted,
//"			uniform vec4x4 agf_CameraMVPMatrixInverted) {
//"	
//"	frag2buffer fragOut;
//"	float2 uvLookup = interpolant.fTexCoord0.xy;
//"
//"	//world-space normal
//"	vec4 NormalandDepth = texture2D( SamplerNormal,uvLookup );
//"	vec4 eyeSpaceNormal;
//"	eyeSpaceNormal.xyz = normalize((NormalandDepth.rgb-0.5)*2);
//"	eyeSpaceNormal.w = 0;
//"	vec4 worldSpaceNormal = mul(agf_CameraModelViewMatrixInverted,eyeSpaceNormal);
//"		
//"	//eye-Space depth
//"	NormalandDepth.rgb = worldSpaceNormal.rgb;
//"	NormalandDepth.a = texture2D( SamplerDepth,uvLookup ).r;
//"		
//"	fragOut.color = NormalandDepth;
//"	
//"	return fragOut;
//"}


