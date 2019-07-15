//agf_include "ctl_toon_fragment_common.glsl"

//agf_include "ctl_toon_interpolants.glsl"


uniform sampler2D SamplerLight;
uniform sampler2D SamplerAlbedo;
uniform sampler2D SamplerFull;
uniform sampler2D SamplerEdges;

uniform vec4		agf_LineColorOpacity;
uniform vec4		agf_PostProcessAlphaFlags;

// Turn this on or off to determine how to handle textures",

#define POSTERIZE_TEXTURES  1


void main()
{
     	vec2 texCoord = vertOut_fTexCoord0.xy;
    	vec2 scs = vec2(1.0/512.0,1.0/512.0); // inverse of screen-size to get at neighboring pixels
    	vec2 tcOffset = texCoord;// + 0.5 * scs; // shift to pixel center
    	vec4 colorSample;
    	
    	vec4 col = texture2D( SamplerAlbedo, tcOffset );	
    
#if POSTERIZE_TEXTURES
    	vec4 src = texture2D( SamplerFull, tcOffset );	
#else
    	vec4 src = texture2D( SamplerLight, tcOffset ).rrrr;
    	vec4 opacityLookup = texture2D( SamplerFull, tcOffset );	
    	src.a = opacityLookup.a;
#endif
    
        float opacity = src.a;
        if (agf_PostProcessAlphaFlags[0]>0.5)
            {
            opacity = 1.0-opacity;
            } //BAZZINGA!
        //Color cometh alpha-premultiplied, so to extract original color, we have to divide here
        if (opacity > 0.00001) 
    		{
    		src.rgb = src.rgb*(1.0/opacity);
    		}
    	float val = (src.r+src.g+src.b)/3.0;
    
        // Do the actual posterization
        const float Bins = 4;
        const float Steepness = 0.7;
        const float MinBrightness = 0.3;

        // Smooth-step computations...

        float binHeight = 1.0/(Bins);
        float binRem = mod(val, binHeight);

        float normRem = binRem/binHeight; // normalized remainder



        float steepness = pow(10.0,Steepness);
        float steepVal = 2.0 * (normRem-0.5) * steepness;
        float sv = smoothstep(-1.0,1.0,steepVal)-0.5;
        float ss = smoothstep(-1.0,1.0,steepness)-0.5;

        float offset = (sv+ss)/(ss+ss);

        float v = MinBrightness + (1.0-MinBrightness)*(val-binRem + offset * binHeight);		
        // Now put the posterized color back together...

        colorSample.rgb = v * col.rgb;

        // and finally, add the edges

        vec3 EdgeColor = vec3(agf_LineColorOpacity.rgb);
        float edgeVal = texture2D( SamplerEdges, tcOffset ).r;
        float e = (1.0-agf_LineColorOpacity.a)*1.0+ agf_LineColorOpacity.a*edgeVal;
        colorSample.rgb = (1.0-e)*EdgeColor + e*colorSample.rgb;
        colorSample.a = max(1.0-col.a,1.0-e);
    
    		
    
    	// Assign output
       colorSample.a = opacity;
    gl_FragColor = colorSample;
}

//	frag2buffer fragOut;
//	vec2 texCoord = interpolant.fTexCoord0.xy;
//	vec2 scs = vec2(1.0/512.0,1.0/512.0); // inverse of screen-size to get at neighboring pixels
//	vec2 tcOffset = texCoord;// + 0.5 * scs; // shift to pixel center
//	vec4 colorSample;
//	
//	vec4 col = texture2D( SamplerAlbedo, tcOffset );	
//
//#if POSTERIZE_TEXTURES
//	vec4 src = texture2D( SamplerFull, tcOffset );	
//#else
//	vec4 src = texture2D( SamplerLight, tcOffset ).rrrr;
//	vec4 opacityLookup = texture2D( SamplerFull, tcOffset );	
//	src.a = opacityLookup.a;
//#endif	
//
//    float opacity = src.a;
//    if (agf_PostProcessAlphaFlags[0]>0.5) { opacity = 1.0-opacity; } //BAZZINGA!
//    //Color cometh alpha-premultiplied, so to extract original color, we have to divide here
//    if (opacity > 0.00001) 
//		{
//		src.rgb = src.rgb*(1.0/opacity);
//		}
//	float val = (src.r+src.g+src.b)/3.0;
//
//		// Do the actual posterization
//
//		
//
//		const float Bins = 4;
//
//		const float Steepness = 0.7;
//
//		const float MinBrightness = 0.3;
//
//		
//
//		// Smooth-step computations...
//
//
//
//		float binHeight = 1.0/(Bins); 
//
//		float binRem = fmod(val, binHeight);
//
//
//
//		float normRem = binRem/binHeight; // normalized remainder
//
//
//
//		float steepness = pow(10.0,Steepness);
//
//		float steepVal = 2.0 * (normRem-0.5) * steepness;
//
//
//
//		float sv = smoothstep(-1.0,1.0,steepVal)-0.5;
//
//		float ss = smoothstep(-1.0,1.0,steepness)-0.5;
//
//
//
//		float offset = (sv+ss)/(ss+ss);
//
//		float v = MinBrightness + (1.0-MinBrightness)*(val-binRem + offset * binHeight);		
//
//		
//
//		// Now put the posterized color back together...
//
//		colorSample.rgb = v * col.rgb;
//
//		
//
//		// and finally, add the edges
//
//		const vec3 EdgeColor = vec3(agf_LineColorOpacity.rgb);
//
//		float edgeVal = texture2D( SamplerEdges, tcOffset ).r;
//
//        float e = (1.0-agf_LineColorOpacity.a)*1.0 + agf_LineColorOpacity.a*edgeVal;
//
//		colorSample.rgb = (1.0-e)*EdgeColor + e*colorSample.rgb;
//
//		colorSample.a = max(1.0-col.a,1.0-e);
//
//	// Assign output
//    colorSample.a = opacity;
//    gl_FragColor = colorSample;
//}