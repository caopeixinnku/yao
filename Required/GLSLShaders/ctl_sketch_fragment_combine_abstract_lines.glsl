
//agf_include "ctl_sketch_interpolants.glsl"

//agf_include "ctl_sketch_fragment_common.glsl"

//agf_include "ctl_sketch_combine_common.glsl"

uniform sampler2D SamplerHatch;
uniform sampler2D SamplerLines;


void main()
 {

    vec2 tex = vertOut_fTexCoord0.xy;
    float edge =  texture2D(SamplerLines, tex).r;
    vec4 hatch4 = texture2D(SamplerHatch, tex);
    vec3 hatch = hatch4.xyz;
    vec3 paper = vec3(1,1,1);
    vec3 paperColor = vec3(1,1,1);
    vec4 color = vec4(1,1,1,1);

	color.xyz = edge*hatch*paper*paperColor;
    color.a = hatch4.a;
    
     gl_FragColor =  color;

}