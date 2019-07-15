
//agf_include "core_fragment.glsl"

//agf_include "main_vertex2fragment.glsl"


//varying	vec3 vertOut_Color; 
//varying	vec3 vertOut_vPosition; 
   
uniform vec4 clippingPlane;

void main()
	{
    vec4 finalColor = vec4(vertOut_Color, 1.0);
    
//########################################## CLIPPING PLANES ################################################################################		
    
    float clipSign = dot(clippingPlane.xyz, vertOut_vPosition.xyz)+clippingPlane.w;
    if (clipSign < 0.0) 
		{
		discard;
		}
    
//########################################## FINAL PROCESSING ################################################################################		
    
    if (finalColor.a == 0.0) discard;
    
    gl_FragColor = finalColor;
	}