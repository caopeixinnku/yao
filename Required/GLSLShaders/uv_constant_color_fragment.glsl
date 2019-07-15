//agf_include "core_fragment.glsl"

//agf_include "vertex2fragment_uv2_tbn.glsl"

uniform vec4 iConstantColor;
uniform float iUseVertexColors;
void main() 
	{
	vec4 finalColor = vertOut_Color; 
	finalColor.a = 1.0; 
	if (iUseVertexColors < 0.5)
		{   
        finalColor = iConstantColor; 
		}
	gl_FragColor = finalColor; 
	}