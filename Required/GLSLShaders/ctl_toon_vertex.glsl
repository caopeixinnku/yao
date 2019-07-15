

//agf_include "ctl_toon_vertex_common.glsl"

//agf_include "ctl_toon_interpolants.glsl"

void main()
{
    vertOut_fEyePosition = vec4(agf_position.xy, 0.0, 1.0);
    vertOut_fTexCoord0 = agf_uv;
    gl_Position = vec4(agf_position.xy, 0.0, 1.0);
}
