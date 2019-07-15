
//agf_include "vertex2fragment_uv2_color.glsl"

uniform sampler2D agf_defaultTexture;
uniform vec4	  agf_defaultConstantColor;
uniform float	  agf_defaultUseVertexColors;
uniform vec4	  agf_defaultUseTexture;
void main()
   {
   vec4 texelColor = texture2D(agf_defaultTexture, vertOut_UV);
   vec4 baseColor = mix(agf_defaultConstantColor, vertOut_Color, agf_defaultUseVertexColors);
   vec4 finalColor = mix(baseColor, texelColor, agf_defaultUseTexture[0]);
   gl_FragColor = finalColor;
   }