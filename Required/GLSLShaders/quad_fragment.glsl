
//agf_include "vertex2fragment_uv2.glsl"

uniform sampler2D quadTex;
uniform float     quadOpacityMultiplier;
void main()
   {
   gl_FragColor = texture2D(quadTex, vertOut_UV);
   gl_FragColor.a = gl_FragColor.a*quadOpacityMultiplier;
   }