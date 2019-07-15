
//agf_include "main_vertex2fragment.glsl"


uniform vec4 clippingPlane;

void main()
    {
    float clipSign = dot(clippingPlane.xyz, vertOut_vPosition.xyz)+clippingPlane.w;
    if (clipSign < 0.0) discard;
    
    gl_FragColor.rgb = vertOut_Color;
    gl_FragColor.a = 1.0;
    }







	  