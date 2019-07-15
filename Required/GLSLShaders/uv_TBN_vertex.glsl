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
    vec3 decodedNormalFromColor = ((AGFVS_COLOR().xyz-vec3(0.49803921568, 0.49803921568, 0.49803921568))*2.00787401577);
    vertOut_n = decodedNormalFromColor;
	vertOut_Color = vec4(0.0, 0.0, 0.0, 0.0);
    gl_Position =	AGF_MATRIX_MVP() * incomingVertex;
    }






	  