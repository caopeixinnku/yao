
//agf_include "core_vertex.glsl"

//agf_include "vertex2fragment_uv2.glsl"
varying	vec3 vertOut_vPosition;
uniform mat4 modelView;
void main()
    {
    vec4 incomingVertex = AGFVS_VERTEX();
    incomingVertex.w = 1.0;
    vertOut_UV = AGFVS_UVW().xy;
        
    vertOut_vPosition   = (modelView*incomingVertex).xyz;
    gl_Position =	AGF_MATRIX_MVP() * incomingVertex;
    }






	  