
//agf_include "ctl_sketch_interpolants.glsl"

//agf_include "ctl_sketch_fragment_common.glsl"

//agf_include "ctl_sketch_tensor_common.glsl"

uniform sampler2D SamplerNormal;
uniform sampler2D SamplerEdge;
uniform sampler2D SamplerDirH;


void main()
{
    	vec2 tex = vertOut_fTexCoord0.xy;
    
    	float depth = texture2D(SamplerNormal, tex*2.0).a; 	
    	if(depth == 0.0) {  
    		gl_FragColor = vec4(0,0,0,1);
    		return;
    	}
    
    	vec4 dir;
    	vec3 stensor_min = vec3(0,0,0);
    	vec3 stensor_max = vec3(0,0,0);
    
    	vec4 tempDir = texture2D(SamplerDirH,tex);
    	stensor_min += dir2tensor(tempDir.xy);
    	stensor_max += dir2tensor(tempDir.zw);
    
    	for(int j=1;j<=fr;j++) {
    		vec2 offset = vec2(j,0)*psize;
    		vec4 tempDir = texture2D(SamplerDirH,tex+offset);
    		float edge = texture2D(SamplerEdge,(tex+offset)*2).r;
    		if(edge < edgeThreshold)
    			break;
    		stensor_min += exp(-(j*j)/(2*sigma*sigma))*dir2tensor(tempDir.xy);
    		stensor_max += exp(-(j*j)/(2*sigma*sigma))*dir2tensor(tempDir.zw);
    	}
    	for(int j=-1;j>=-fr;j--) {
    		vec2 offset = vec2(j,0)*psize;
    		vec4 tempDir = texture2D(SamplerDirH,tex+offset);
    		float edge = texture2D(SamplerEdge,(tex+offset)*2).r;
    		if(edge < edgeThreshold)
    			break;
    		stensor_min += exp(-(j*j)/(2*sigma*sigma))*dir2tensor(tempDir.xy);
    		stensor_max += exp(-(j*j)/(2*sigma*sigma))*dir2tensor(tempDir.zw);
    	}
    
    	dir.xy = normalize(tensor2dir(stensor_min));
    	dir.zw = normalize(tensor2dir(stensor_max));
    
    	if(isnan_1f(dir.x) || isnan_1f(dir.y))
    		dir.xy = vec2(0,0);
    	if(isnan_1f(dir.z) || isnan_1f(dir.w)) 
    		dir.zw = vec2(0,0);
    	
    	if(dir.y<0) 
    		dir.xy = -dir.xy;
    	if(dir.w<0) 
    		dir.zw = -dir.zw;
    
    	gl_FragColor = vec4(dir.xy, dir.zw);
 //   	dir.zw = vec2(0,1);

}


//frag2buffer composeFragH(in vertex2frag interpolant, 
//			uniform sampler2D SamplerNormal,
//			uniform sampler2D SamplerEdge,	
//			uniform sampler2D SamplerDirH)
//{
//	frag2buffer fragOut;
//
//	vec2 tex = interpolant.0TexCoord0.xy;
//
//	float depth = texture2D(SamplerNormal, tex*2.0).a; 	
//	if(depth == 0.0) {  
//		fragOut.color = vec4(0,0,0,1);
//		return fragOut;
//	}
//
//	vec4 dir;
//	vec3 stensor_min = vec3(0,0,0);
//	vec3 stensor_max = vec3(0,0,0);
//
//	vec4 tempDir = texture2D(SamplerDirH,tex);
//	stensor_min += dir2tensor(tempDir.xy);
//	stensor_max += dir2tensor(tempDir.zw);
//
//	for(int j=1;j<=fr;j++) {
//		vec2 offset = vec2(j,0)*psize;
//		vec4 tempDir = texture2D(SamplerDirH,tex+offset);
//		float edge = texture2D(SamplerEdge,(tex+offset)*2).r;
//		if(edge < edgeThreshold)
//			break;
//		stensor_min += exp(-(j*j)/(2*sigma*sigma))*dir2tensor(tempDir.xy);
//		stensor_max += exp(-(j*j)/(2*sigma*sigma))*dir2tensor(tempDir.zw);
//	}
//	for(int j=-1;j>=-fr;j--) {
//		vec2 offset = vec2(j,0)*psize;
//		vec4 tempDir = texture2D(SamplerDirH,tex+offset);
//		float edge = texture2D(SamplerEdge,(tex+offset)*2).r;
//		if(edge < edgeThreshold)
//			break;
//		stensor_min += exp(-(j*j)/(2*sigma*sigma))*dir2tensor(tempDir.xy);
//		stensor_max += exp(-(j*j)/(2*sigma*sigma))*dir2tensor(tempDir.zw);
//	}
//
//	dir.xy = normalize(tensor2dir(stensor_min));
//	dir.zw = normalize(tensor2dir(stensor_max));
//
//	if(isnan(dir.x) || isnan(dir.y))
//		dir.xy = vec2(0,0);
//	if(isnan(dir.z) || isnan(dir.w)) 
//		dir.zw = vec2(0,0);
//	
//	if(dir.y<0) 
//		dir.xy = -dir.xy;
//	if(dir.w<0) 
//		dir.zw = -dir.zw;
//
//	fragOut.color = vec4(dir.xy, dir.zw);
//	dir.zw = vec2(0,1);
//
//	return fragOut;