//agf_include "volume_vertex2fragment.glsl"

uniform vec4 clippingPlaneColor;

void main()
{
    gl_FragColor.rgb = clippingPlaneColor.rgb*clippingPlaneColor.a;
    gl_FragColor.a = clippingPlaneColor.a;
}
