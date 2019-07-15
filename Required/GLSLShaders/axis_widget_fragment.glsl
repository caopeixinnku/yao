//agf_include "main_vertex2fragment.glsl"

uniform vec4 partColor;

void main()
{
    vec4 finalColor = vec4(partColor);

    vec3 normal = normalize(vertOut_vNormal);
    vec3 light = normalize(vec3(-0.57735, 0.57735, 1.0));
    
    float ndotl = max (0.0, (dot(normal, light)));

    float scalarDiffuse = 0.7;
    float scalarAmbient = 0.3;
    float scalarLight = ndotl*scalarDiffuse+scalarAmbient;
    float clampedLight = clamp(scalarLight, 0.0, 1.0);
    
    finalColor.rgb = clampedLight*partColor.rgb;
    finalColor.a = 1.0;
    
    if (finalColor.a == 0.0) discard;

    finalColor.rgb = finalColor.rgb*finalColor.a;

	gl_FragColor = finalColor;
}
