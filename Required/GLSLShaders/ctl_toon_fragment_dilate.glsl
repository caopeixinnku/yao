//agf_include "ctl_toon_fragment_common.glsl"

//agf_include "ctl_toon_interpolants.glsl"


uniform sampler2D SamplerSobelMag;

uniform float direction;
uniform float agf_LineWidth;

void main()
{
    vec2 texCoord = vertOut_fTexCoord0.xy;
    vec2 scs = vec2(1.0/512.0,1.0/512.0); // inverse of screen-size to get at neighboring pixels
    vec2 pos = texCoord;// + 0.5 * scs; // shift to pixel center
    float dx = scs.x;
    float dy = scs.y;
    float radius = 2;//*agf_LineWidth; 
    float r;
    float v = 0;
    for(r=-radius; r<=radius; r+=1.0)
        {
        v = max(v, texture2D(SamplerSobelMag, pos + vec2(r*dx,0)).r);
        }
    // Assign output
    gl_FragColor = vec4(v,v,v,1.0);
}


//	frag2buffer composeFrag(in vertex2frag interpolant, 
//							uniform sampler2D SamplerSobelMag,
//							uniform float4x4  agf_CameraModelViewMatrixInverted,
//							uniform float4x4  agf_CameraMVPMatrixInverted,
//							uniform float direction,
//							uniform float agf_LineWidth)
//	{
//		frag2buffer fragOut;
//		float2 texCoord = interpolant.fTexCoord0.xy;
//		float2 scs = float2(1.0/512.0,1.0/512.0); // inverse of screen-size to get at neighboring pixels
//		float2 pos = texCoord;// + 0.5 * scs; // shift to pixel center
//		float dx = scs.x;
//		float dy = scs.y;
//		float radius = 2; 
//		float r;
//		float v = 0;
//		for(r=-radius; r<=radius; r+=1.0)
//			v = max(v, tex2D(SamplerSobelMag, pos + vec2(r*dx,0)).r);
//		// Assign output
//		fragOut.color = vec4(v,v,v,1.0);
//		return fragOut;
//	}