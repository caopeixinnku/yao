
//agf_include "vertex2fragment_uv2.glsl"

uniform sampler2D quadTex;
uniform float quadOpacityInvert;
uniform float quadOpacityPremultiply;

void main()
    {
    vec4 lookup = texture2D(quadTex,vertOut_UV);
    float opacity=lookup.a;
    float opacity_multiplier=1.0;
    if (quadOpacityInvert > 0.5)
        {
        opacity = 1.0 - opacity;
        }
    if (opacity>0.0)
        {
        opacity_multiplier = 1.0/opacity;
        }
    vec4 finalColor;
    finalColor.rgb = lookup.rgb*opacity_multiplier;
    finalColor.a = opacity;
        
    if (quadOpacityPremultiply>0.5)
        {
        finalColor.rgb = finalColor.rgb*opacity;
        }
    
    gl_FragColor = finalColor;
    }






	  