//agf_include "core_vertex.glsl"

//agf_include "vertex2fragment_uv2.glsl"

void main()
	{
	vec4 vertex = AGFVS_VERTEX();
	vec4 normalizedVertex = vec4(0.5)*vertex + vec4(0.5);
	vertOut_UV = normalizedVertex.xy'
	gl_Position = vertex;
	}