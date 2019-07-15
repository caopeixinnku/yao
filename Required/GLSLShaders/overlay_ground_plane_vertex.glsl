//agf_include "core_vertex.glsl"

//agf_include "vertex2fragment_uv2.glsl"

void main()
	{
	vec4 uv = AGFVS_UVW();
	vertOut_UV = uv.xy;

	gl_Position = AGF_MATRIX_MVP() * AGFVS_VERTEX();

	}