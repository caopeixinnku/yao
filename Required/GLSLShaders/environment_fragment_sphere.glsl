

//agf_include "core_fragment.glsl"

//agf_include "vertex2fragment_uv2.glsl"

//agf_include "environment_fragment_shared_functions.glsl"


varying	vec3        vertOut_vPosition;

uniform sampler2D	environment_texture;
uniform mat4		reflectionTransformation;
uniform vec4        environmentColor;


void main()
    {
    vec4 envColor;
    vec4 texLookup;
    vec3 reflectionVector;
    vec4 eyeRay;
    eyeRay.xyz = normalize(vertOut_vPosition);
    eyeRay.w = 0;
    reflectionVector = (reflectionTransformation*eyeRay).xyz;
    texLookup = texSPHEREIdentity(environment_texture, reflectionVector);
    envColor.rgb = mix(environmentColor.rgb, texLookup.rgb, texLookup.a);
    gl_FragColor.rgb = envColor.rgb;
    gl_FragColor.a = environmentColor.a;
    }






	  