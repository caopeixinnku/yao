
//agf_include "ctl_sketch_interpolants.glsl"

//agf_include "ctl_sketch_fragment_common.glsl"


uniform sampler2D SamplerLowImg;

void main()

{
    vec4 colorSample = vec4(0.0, 0.0, 0.0, 1.0);
    vec2 tex = vertOut_fTexCoord0.xy;
    
    vec4 dir = texture2D(SamplerLowImg, tex*0.5);
    
    if(isnan_1f(dir.x) || isnan_1f(dir.y)) dir.xy = vec2(0,0);
    if(isnan_1f(dir.z) || isnan_1f(dir.w)) dir.zw = vec2(0,0);
    
    if(dir.y<0) dir.xy = -dir.xy;
    if(dir.w<0) dir.zw = -dir.zw;
    
    gl_FragColor = dir;
	gl_FragColor.a = 1.0;
}