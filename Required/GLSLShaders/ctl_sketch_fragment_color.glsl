
//agf_include "ctl_sketch_interpolants.glsl"

//agf_include "ctl_sketch_fragment_common.glsl"

uniform sampler2D SamplerLight;
uniform vec4 agf_PostProcessAlphaFlags;

void main()
{
    vec2 uvLookup = vertOut_fTexCoord0.xy;
    vec4 colorSample = vec4(1.0, 1.0, 1.0, 1.0);
    vec2 texCoord = vertOut_fTexCoord0.xy;
    colorSample.a = 1.0;
    colorSample.rgba = texture2D(SamplerLight, texCoord).rgba;
    float opacity = colorSample.a;
    if (agf_PostProcessAlphaFlags[0]>0.5) { opacity = 1.0-opacity; } //BAZZINGA!
    //Color cometh alpha-premultiplied, so to extract original color, we have to divide here
    if (opacity > 0.00001) 
        {
        colorSample.rgb = colorSample.rgb*(1.0/opacity);
        }
    colorSample.a = opacity;
    gl_FragColor = colorSample;
}

//frag2buffer composeFrag(in vertex2frag interpolant, 
//						uniform sampler2D SamplerLight,
//						uniform vec4   agf_PostProcessAlphaFlags) {
//    frag2buffer fragOut;
//    vec2 uvLookup = vertOut_fTexCoord0.xy;
//    vec4 colorSample = vec4(1.0, 1.0, 1.0, 1.0);
//    vec2 texCoord = vertOut_fTexCoord0.xy;
//    colorSample.a = 1.0;
//    colorSample.rgba = texture2D(SamplerLight, texCoord).rgba;
//    float opacity = colorSample.a;
//    if (agf_PostProcessAlphaFlags[0]>0.5) { opacity = 1.0-opacity; } //BAZZINGA!
//    //Color cometh alpha-premultiplied, so to extract original color, we have to divide here
//    if (opacity > 0.00001) 
//		{
//		colorSample.rgb = colorSample.rgb*(1.0/opacity);
//		}
//    colorSample.a = opacity;
//    fragOut.color = colorSample;
//    return fragOut;
//}
