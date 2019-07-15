//agf_include "core_vertex.glsl"

//agf_include "vertex2fragment_uv2_tbn.glsl"


void main()
    {
    vec4 incomingVertex = AGFVS_VERTEX();
    incomingVertex.z = 0.0; 
    incomingVertex.w = 1.0; 
    vertOut_UV = AGFVS_UVW().xy;
    vertOut_t = AGFVS_TANGENT().xyz;
    vertOut_b = AGFVS_BINORMAL().xyz;
	vertOut_n = vec3(0.0, 0.0, 1.0);
    vertOut_Color = AGFVS_COLOR();
    gl_Position =	AGF_MATRIX_MVP() * incomingVertex;
    }






	  