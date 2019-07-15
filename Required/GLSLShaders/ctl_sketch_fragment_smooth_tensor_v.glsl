//agf_include "ctl_sketch_interpolants.glsl"

//agf_include "ctl_sketch_fragment_common.glsl"

//agf_include "ctl_sketch_tensor_common.glsl"

uniform sampler2D SamplerNormal;
uniform sampler2D SamplerEdge;
uniform sampler2D SamplerDirV;


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
    
    	vec4 tempDir = texture2D(SamplerDirV,tex);
    	stensor_min += dir2tensor(tempDir.xy);
    	stensor_max += dir2tensor(tempDir.zw);
    
    	for(int i=1;i<=fr;i++) {
    		vec2 offset = vec2(0,i)*psize;
    		vec4 tempDir = texture2D(SamplerDirV,tex+offset);
    		float edge = texture2D(SamplerEdge,(tex+offset)*2).r;
    		if(edge < edgeThreshold)
    			break;
    		stensor_min += exp(-(i*i)/(2*sigma*sigma))*dir2tensor(tempDir.xy);
    		stensor_max += exp(-(i*i)/(2*sigma*sigma))*dir2tensor(tempDir.zw);
    	}
    	for(int i=-1;i>=-fr;i--) {
    		vec2 offset = vec2(0,i)*psize;
    		vec4 tempDir = texture2D(SamplerDirV,tex+offset);
    		float edge = texture2D(SamplerEdge,(tex+offset)*2).r;
    		if(edge < edgeThreshold)
    			break;
    		stensor_min += exp(-(i*i)/(2*sigma*sigma))*dir2tensor(tempDir.xy);
    		stensor_max += exp(-(i*i)/(2*sigma*sigma))*dir2tensor(tempDir.zw);
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

}

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
//	vec4 tempDir = texture2D(SamplerDirV,tex);
//	stensor_min += dir2tensor(tempDir.xy);
//	stensor_max += dir2tensor(tempDir.zw);
//
//	for(int i=1;i<=fr;i++) {
//		vec2 offset = vec2(0,i)*psize;
//		vec4 tempDir = texture2D(SamplerDirV,tex+offset);
//		float edge = texture2D(SamplerEdge,(tex+offset)*2).r;
//		if(edge < edgeThreshold)
//			break;
//		stensor_min += exp(-(i*i)/(2*sigma*sigma))*dir2tensor(tempDir.xy);
//		stensor_max += exp(-(i*i)/(2*sigma*sigma))*dir2tensor(tempDir.zw);
//	}
//	for(int i=-1;i>=-fr;i--) {
//		vec2 offset = vec2(0,i)*psize;
//		vec4 tempDir = texture2D(SamplerDirV,tex+offset);
//		float edge = texture2D(SamplerEdge,(tex+offset)*2).r;
//		if(edge < edgeThreshold)
//			break;
//		stensor_min += exp(-(i*i)/(2*sigma*sigma))*dir2tensor(tempDir.xy);
//		stensor_max += exp(-(i*i)/(2*sigma*sigma))*dir2tensor(tempDir.zw);
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