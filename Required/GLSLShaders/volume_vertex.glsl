

//agf_include "volume_vertex2fragment.glsl"
attribute vec3 agf_position;
attribute vec3 agf_uv;
uniform mat4 agf_mvp_matrix;
void main()
    {
    vec4 incomingVertex;
    incomingVertex.xyz = agf_position;
    incomingVertex.w = 1.0;
    vertOut_UVW = agf_uv;
    gl_Position =	agf_mvp_matrix * incomingVertex;
    }






	  