

//agf_include "core_fragment.glsl"

//agf_include "vertex2fragment_uv2.glsl"

//agf_include "environment_fragment_shared_functions.glsl"

varying	vec3        vertOut_vPosition;

uniform sampler2D	environment_texture;
uniform vec4        environmentColor;

/***********************************************************************/

void main()
    {
    vec2 uv = vertOut_UV;
    vec4 envColor;
    vec4 texLookup;
    texLookup = texture2D(environment_texture, uv);
    envColor.rgb = mix(environmentColor.rgb, texLookup.rgb, texLookup.a);
    if (uv.x < 0 || uv.x > 1 || uv.y<0 || uv.y>1)
        envColor.rgb = environmentColor.rgb;
    gl_FragColor.rgb = envColor.rgb;
    gl_FragColor.a = environmentColor.a;
    }