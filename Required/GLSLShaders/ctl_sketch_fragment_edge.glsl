
//agf_include "ctl_sketch_interpolants.glsl"

//agf_include "ctl_sketch_fragment_common.glsl"


 float thSilhouette = 0.000002;
 float thCrease = 0.7;


/// Core functions -------------------------------------------------------------
float findSilhouette(vec4 nbd[9]) {
	int i, j;
	float center = nbd[4].w;
	float edge = 1.0;
	float dog = 0.0;

	for(i = 0; i < 9; i++) {
		dog += nbd[i].w;
	}
	dog /= 9.0;
	dog -= center;

	// silhouette
	if(dog > thSilhouette && center < 1.0) {		
		edge = clamp(pow(1-dog,5)*0.5+0.3, 0.0, 1.0);
	}
	return edge;
}



float findCrease(vec4 nbd[9]) {
	float fNormalDist = (	dot(nbd[6].xyz, nbd[2].xyz) + 
				dot(nbd[8].xyz, nbd[0].xyz) + 
				dot(nbd[3].xyz, nbd[5].xyz) + 
				dot(nbd[1].xyz, nbd[7].xyz) 	) * 0.25;

	float edge = 1.0;
	if(isfinite_1f(fNormalDist) && fNormalDist < thCrease) {
		edge = clamp(fNormalDist, 0.0, 1.0);
	}
	return edge;
}




uniform sampler2D SamplerNormal;
uniform sampler2D SamplerPosition;


void main()
{
    vec2 texCoord = vertOut_fTexCoord0.xy;
    
    //background
    if(texture2D(SamplerNormal, texCoord).w == 0.0) {
        gl_FragColor = vec4(1,1,1,1);
        return;
    }
    
    //foreground
    vec4 nbd[9];
    
    for(int i=-1;i<=1;i++) {
        for(int j=-1;j<=1;j++) {
            vec2 tex = texCoord + vec2(psize*i,psize*j);
            nbd[(i+1)*3+(j+1)] = texture2D(SamplerNormal, tex);
        }
    }
    
    float edge = 1.0;
    edge = findSilhouette(nbd);
    
    if(edge == 1.0)
        edge = findCrease(nbd);
    
    gl_FragColor = clamp(vec4(edge,edge,edge,1), vec4(0, 0, 0, 0), vec4(1, 1, 1, 1));
}


//frag2buffer composeFrag(in vertex2frag interpolant)
//{
//	frag2buffer fragOut;
//	vec2 texCoord = interpolant.fTexCoord0.xy;
//
//	//background
//	if(texture2D(SamplerNormal, texCoord).w == 0.f) {
//		fragOut.color = vec4(1,1,1,1);
//		return fragOut;
//	}
//
//	//foreground
//	vec4 nbd[9];
//
//	for(int i=-1;i<=1;i++) {
//		for(int j=-1;j<=1;j++) {
//			vec2 tex = texCoord + vec2(psize*i,psize*j);
//			nbd[(i+1)*3+(j+1)] = texture2D(SamplerNormal, tex);
//		}
//	}
//
//	float edge = 1.f;
//	edge = findSilhouette(nbd);
//
//	if(edge == 1.f) 
//		edge = findCrease(nbd); 
//
//	fragOut.color = saturate(vec4(edge,edge,edge,1));
//
//	return fragOut;
//}