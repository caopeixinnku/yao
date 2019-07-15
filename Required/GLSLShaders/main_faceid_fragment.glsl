//agf_include "main_vertex2fragment.glsl"

uniform vec4 clippingPlane;
void main()
{
		vec4 finalColor;
		finalColor.rgb = vec3(vertOut_Color.rgb);
		finalColor.a = 1.0;
//########################################## CLIPPING PLANES ################################################################################		

		float clipSign = dot(clippingPlane.xyz, vertOut_vPosition.xyz)+clippingPlane.w;
		if (clipSign < 0.0) discard;

//########################################## FINAL PROCESSING ################################################################################		

	gl_FragColor = finalColor;
}
