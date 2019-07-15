//agf_include "volume_vertex2fragment.glsl"

uniform sampler3D voltexture;
uniform vec4 clippingPlaneColor;
uniform vec3 clippingPlaneIntersectionColor;
uniform vec4 gradientSamplingDistancesTexture;
uniform vec4 gradientSamplingDistancesObject;
uniform float use_transfer_function;
uniform sampler1D transfer_function;
uniform float volume_opacity_multiplier;

void main()
{
    
    if (abs(vertOut_UVW.x - 0.5)>0.5 || abs(vertOut_UVW.y - 0.5)>0.5 || abs(vertOut_UVW.z - 0.5)>0.5)
        discard;
    
    vec4 main_lookup = texture3D(voltexture, vertOut_UVW);
    main_lookup.rgb = main_lookup.rgb*main_lookup.a;
    
    if (length(main_lookup.rgb)==0.0)
        discard;
    
    gl_FragColor = main_lookup;

    
}
