
//agf_include "ctl_toon_fragment_common.glsl"

//agf_include "ctl_toon_interpolants.glsl"


uniform sampler2D SamplerDepth;
uniform sampler2D SamplerNormal;



void main()
    {
    vec2 uvLookup = vertOut_fTexCoord0.xy;
    vec4 colorSample = vec4(1, 1, 0.0, 1);
    vec2 texCoord = vertOut_fTexCoord0.xy;
    vec2 scs = vec2(1.0/512.0,1.0/512.0); // inverse of screen-size to get at neighboring pixels
    vec2 pos = texCoord;// + 0.5 * scs; // shift to pixel center
    float dx = scs.x;
    float dy = scs.y;

    // Depth edges
    float d00 =  texture2D(SamplerDepth, pos + vec2(-dx,-dy)).r;
    float d01 =  texture2D(SamplerDepth, pos + vec2(0,-dy)).r;
    float d02 =  texture2D(SamplerDepth, pos + vec2(dx,-dy)).r;

    float d10 =  texture2D(SamplerDepth, pos + vec2(-dx,0)).r;
    float d12 =  texture2D(SamplerDepth, pos + vec2(dx,0)).r;

    float d20 =  texture2D(SamplerDepth, pos + vec2(-dx,dy)).r;
    float d21 =  texture2D(SamplerDepth, pos + vec2(0,dy)).r;
    float d22 =  texture2D(SamplerDepth, pos + vec2(dx,dy)).r;

    float du = (
        -1.0 * d00 + 
        -2.0 * d10 + 
        -1.0 * d20 + 
         1.0 * d02 + 
         2.0 * d12 + 
         1.0 * d22  
    ) / 4.0;

    float dv = (
        -1.0 * d00 + 
        -2.0 * d01 + 
        -1.0 * d02 + 
         1.0 * d20 + 
         2.0 * d21 + 
         1.0 * d22  
    ) / 4.0;

    vec3 n00 =  (texture2D(SamplerNormal, pos + vec2(-dx,-dy)).rgb - vec3(0.5,0.5,0.5))*2.0;
    vec3 n01 =  (texture2D(SamplerNormal, pos + vec2(0,-dy)).rgb - vec3(0.5,0.5,0.5))*2.0;
    vec3 n02 =  (texture2D(SamplerNormal, pos + vec2(dx,-dy)).rgb - vec3(0.5,0.5,0.5))*2.0;

    vec3 n10 =  (texture2D(SamplerNormal, pos + vec2(-dx,0)).rgb - vec3(0.5,0.5,0.5))*2.0;
    vec3 n12 =  (texture2D(SamplerNormal, pos + vec2(dx,0)).rgb - vec3(0.5,0.5,0.5))*2.0;

    vec3 n20 =  (texture2D(SamplerNormal, pos + vec2(-dx,dy)).rgb - vec3(0.5,0.5,0.5))*2.0;
    vec3 n21 =  (texture2D(SamplerNormal, pos + vec2(0,dy)).rgb - vec3(0.5,0.5,0.5))*2.0;
    vec3 n22 =  (texture2D(SamplerNormal, pos + vec2(dx,dy)).rgb - vec3(0.5,0.5,0.5))*2.0;

    vec3 nu = (
        -1.0 * n00 + 
        -2.0 * n10 + 
        -1.0 * n20 + 
         1.0 * n02 + 
         2.0 * n12 + 
         1.0 * n22  
    ) / 4.0;

    vec3 nv = (
        -1.0 * n00 + 
        -2.0 * n01 + 
        -1.0 * n02 + 
         1.0 * n20 + 
         2.0 * n21 + 
         1.0 * n22  
    ) / 4.0;
    
    float dmag = clamp(pow(du*du + dv*dv,0.5),0,1);
    float nmag = clamp(pow(dot(nu,nu) + dot(nv,nv),3.0),0,1);
    float mag = max(dmag,nmag);
    
    // Assign output

    gl_FragColor = vec4(mag,mag,mag,1.0);
    }

//	frag2buffer composeFrag(in vertex2frag interpolant, 
//							uniform sampler2D SamplerDepth,
//							uniform sampler2D SamplerNormal,	
//							uniform float4x4  agf_CameraModelViewMatrixInverted,
//							uniform float4x4  agf_CameraMVPMatrixInverted)
//	{
//		frag2buffer fragOut;
//		float2 uvLookup = interpolant.fTexCoord0.xy;
//		float4 colorSample = float4(1, 1, 0.0, 1);
//		float2 texCoord = interpolant.fTexCoord0.xy;
//		float2 scs = float2(1.0/512.0,1.0/512.0); // inverse of screen-size to get at neighboring pixels
//		float2 pos = texCoord;// + 0.5 * scs; // shift to pixel center
//		float dx = scs.x;
//		float dy = scs.y;
//
//		// Depth edges
//		float d00 =  texture2D(SamplerDepth, pos + vec2(-dx,-dy)).r;
//		float d01 =  texture2D(SamplerDepth, pos + vec2(0,-dy)).r;
//		float d02 =  texture2D(SamplerDepth, pos + vec2(dx,-dy)).r;
//
//		float d10 =  texture2D(SamplerDepth, pos + vec2(-dx,0)).r;
//		float d12 =  texture2D(SamplerDepth, pos + vec2(dx,0)).r;
//
//		float d20 =  texture2D(SamplerDepth, pos + vec2(-dx,dy)).r;
//		float d21 =  texture2D(SamplerDepth, pos + vec2(0,dy)).r;
//		float d22 =  texture2D(SamplerDepth, pos + vec2(dx,dy)).r;
//
//		float du = (
//			-1.0 * d00 + 
//			-2.0 * d10 + 
//			-1.0 * d20 + 
//			 1.0 * d02 + 
//			 2.0 * d12 + 
//			 1.0 * d22  
//		) / 4.0;
//
//		float dv = (
//			-1.0 * d00 + 
//			-2.0 * d01 + 
//			-1.0 * d02 + 
//			 1.0 * d20 + 
//			 2.0 * d21 + 
//			 1.0 * d22  
//		) / 4.0;
//
//		// Normal Edges
///*		vec3 n00 =  texture2D(SamplerNormal, pos + vec2(-dx,-dy)).rgb;
//		vec3 n01 =  texture2D(SamplerNormal, pos + vec2(0,-dy)).rgb;
//		vec3 n02 =  texture2D(SamplerNormal, pos + vec2(dx,-dy)).rgb;
//
//		vec3 n10 =  texture2D(SamplerNormal, pos + vec2(-dx,0)).rgb;
//		vec3 n12 =  texture2D(SamplerNormal, pos + vec2(dx,0)).rgb;
//
//		vec3 n20 =  texture2D(SamplerNormal, pos + vec2(-dx,dy)).rgb;
//		vec3 n21 =  texture2D(SamplerNormal, pos + vec2(0,dy)).rgb;
//		vec3 n22 =  texture2D(SamplerNormal, pos + vec2(dx,dy)).rgb;
//*/
//		vec3 n00 =  (texture2D(SamplerNormal, pos + vec2(-dx,-dy)).rgb - vec3(0.5,0.5,0.5))*2.0;
//		vec3 n01 =  (texture2D(SamplerNormal, pos + vec2(0,-dy)).rgb - vec3(0.5,0.5,0.5))*2.0;
//		vec3 n02 =  (texture2D(SamplerNormal, pos + vec2(dx,-dy)).rgb - vec3(0.5,0.5,0.5))*2.0;
//
//		vec3 n10 =  (texture2D(SamplerNormal, pos + vec2(-dx,0)).rgb - vec3(0.5,0.5,0.5))*2.0;
//		vec3 n12 =  (texture2D(SamplerNormal, pos + vec2(dx,0)).rgb - vec3(0.5,0.5,0.5))*2.0;
//
//		vec3 n20 =  (texture2D(SamplerNormal, pos + vec2(-dx,dy)).rgb - vec3(0.5,0.5,0.5))*2.0;
//		vec3 n21 =  (texture2D(SamplerNormal, pos + vec2(0,dy)).rgb - vec3(0.5,0.5,0.5))*2.0;
//		vec3 n22 =  (texture2D(SamplerNormal, pos + vec2(dx,dy)).rgb - vec3(0.5,0.5,0.5))*2.0;
//
//		vec3 nu = (
//			-1.0 * n00 + 
//			-2.0 * n10 + 
//			-1.0 * n20 + 
//			 1.0 * n02 + 
//			 2.0 * n12 + 
//			 1.0 * n22  
//		) / 4.0;
//
//		vec3 nv = (
//			-1.0 * n00 + 
//			-2.0 * n01 + 
//			-1.0 * n02 + 
//			 1.0 * n20 + 
//			 2.0 * n21 + 
//			 1.0 * n22  
//		) / 4.0;
//		
//		float dmag = clamp(pow(du*du + dv*dv,0.5),0,1);
//		float nmag = clamp(pow(dot(nu,nu) + dot(nv,nv),3.0),0,1);
//		float mag = max(dmag,nmag);
//		
//		// Assign output
//		fragOut.color = vec4(mag,mag,mag,1.0);
//		return fragOut;
//	}
////EOF"