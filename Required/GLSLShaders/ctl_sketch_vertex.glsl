

//agf_include "ctl_sketch_vertex_common.glsl"

//agf_include "ctl_sketch_interpolants.glsl"

void main()
{
    vertOut_fEyePosition = vec4(agf_position.xy, 0.0, 1.0);
    vertOut_fTexCoord0 = (agf_position + vec4( 1.0, 1.0, 1.0, 1.0)) * vec4( 0.5, 0.5, 0.5, 0.5);
    gl_Position = vec4(agf_position.xy, 0.0, 1.0);
}
