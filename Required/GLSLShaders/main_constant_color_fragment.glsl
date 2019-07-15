varying	vec3 vertOut_vPosition; //TEXCOORD7;

uniform vec4 constantColor;
uniform vec4 clippingPlane;
uniform vec4 extraReflectionClippingPlane;
void main()
{
		vec4 finalColor = vec4(constantColor);

//########################################## CLIPPING PLANES ################################################################################		

		float clipSign = dot(clippingPlane.xyz, vertOut_vPosition.xyz)+clippingPlane.w;
		if (clipSign < 0.0) discard;

		float extraClipSign = dot(extraReflectionClippingPlane.xyz, vertOut_vPosition.xyz)+extraReflectionClippingPlane.w;
		if (extraClipSign < 0.0) discard;

//########################################## FINAL PROCESSING ################################################################################		

		if (finalColor.a == 0.0) discard;

#ifdef ENABLE_ALPHA_PREMULTIPLY
		finalColor.rgb = finalColor.rgb*finalColor.a;
#endif


	gl_FragColor = finalColor;
}
