
//agf_include "core_vertex.glsl"

//agf_include "vertex2fragment_uv2_color.glsl"

void main()
	{
	vec4 uv = AGFVS_UVW();
	vertOut_UV = uv.xy;
	vertOut_Color =  AGFVS_COLOR();

	gl_Position = AGF_MATRIX_MVP() * AGFVS_VERTEX();

	}