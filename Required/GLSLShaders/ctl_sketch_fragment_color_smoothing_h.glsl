
//agf_include "ctl_sketch_interpolants.glsl"

//agf_include "ctl_sketch_fragment_common.glsl"

uniform sampler2D SamplerColorH;

void main()
{
    	float sigma = line_width/2.0;
    	
    	vec2 texCoord = vertOut_fTexCoord0.xy;
    
    	vec4 color = vec4(0,0,0,0);
    	float kernelsum = 0;
    
    	int i=0;		
    	for(int j=-int(line_width);j<=int(line_width);j++)
            {
    		float weight = exp(-float(i*i+j*j)/(2*sigma*sigma));           
    		vec2 tex = texCoord+vec2(i,j)*psize;
    		color.rgb += weight*texture2D(SamplerColorH, tex).rgb;     
    		kernelsum += weight;
            }
    	color.rgb/=kernelsum;   
    	color.a = 1.0;

    gl_FragColor = color;
}


//frag2buffer composeFragH(in vertex2frag interpolant, 
//			uniform sampler2D SamplerColorH)
//{    
//	frag2buffer fragOut;  
//	float sigma = line_width/2.f;
//	
//	float2 texCoord = interpolant.fTexCoord0.xy;
//
//	float4 color = float4(0,0,0,0);
//	float kernelsum = 0;
//
//	int i=0;		
//	for(int j=-line_width;j<=line_width;j++) {
//		float weight = exp(-(float)(i*i+j*j)/(2*sigma*sigma));           
//		float2 tex = texCoord+float2(i,j)*psize;
//		color.rgb += weight*texture2D(SamplerColorH, tex).rgb;     
//		kernelsum += weight;
//	}      
//	color.rgb/=kernelsum;   
//	color.a = 1.f;
//
//	fragOut.color = color;
//	return fragOut;
//}

