
//agf_include "ctl_sketch_interpolants.glsl"

//agf_include "ctl_sketch_fragment_common.glsl"

//agf_include "ctl_sketch_combine_common.glsl"

uniform sampler2D SamplerHatch;
uniform sampler2D SamplerEdge;

void main()
{
    vec2 tex = vertOut_fTexCoord0.xy;
    vec3 edge;
    vec3 hatch = texture2D(SamplerHatch, tex).xyz;
    vec3 paper;
    paper = vec3(1,1,1);
    vec3 paperColor = vec3(1,1,1);
    vec4 color = vec4(1,1,1,1);
    float fInverseGeomMapWidth= 1/2560.0;
    float fInverseGeomMapHeight= 1/960.0;
    vec2 texCoord[9];

    texCoord[0*3+0] = tex + vec2(fInverseGeomMapWidth*(-1), fInverseGeomMapHeight*(-1));
    texCoord[0*3+1] = tex + vec2(fInverseGeomMapWidth*(0), fInverseGeomMapHeight*(-1));
    texCoord[0*3+2] = tex + vec2(fInverseGeomMapWidth*(1), fInverseGeomMapHeight*(-1));
    texCoord[1*3+0] = tex + vec2(fInverseGeomMapWidth*(-1), fInverseGeomMapHeight*(0));
    texCoord[1*3+1] = tex + vec2(fInverseGeomMapWidth*(0), fInverseGeomMapHeight*(0));
    texCoord[1*3+2] = tex + vec2(fInverseGeomMapWidth*(1), fInverseGeomMapHeight*(0));
    texCoord[2*3+0] = tex + vec2(fInverseGeomMapWidth*(-1), fInverseGeomMapHeight*(1));
    texCoord[2*3+1] = tex + vec2(fInverseGeomMapWidth*(0), fInverseGeomMapHeight*(1));
    texCoord[2*3+2] = tex + vec2(fInverseGeomMapWidth*(1), fInverseGeomMapHeight*(1));

    vec4 nbd[9];
    nbd[0] =  texture2D(SamplerEdge, texCoord[0]) * 0.25;
    nbd[1] =  texture2D(SamplerEdge, texCoord[1]) * 0.5;
    nbd[2] =  texture2D(SamplerEdge, texCoord[2]) * 0.25;
    nbd[3] =  texture2D(SamplerEdge, texCoord[3]) * 0.5;
    nbd[4] =  texture2D(SamplerEdge, texCoord[4]);
    nbd[5] =  texture2D(SamplerEdge, texCoord[5]) * 0.5;
    nbd[6] =  texture2D(SamplerEdge, texCoord[6]) * 0.25;
    nbd[7] =  texture2D(SamplerEdge, texCoord[7]) * 0.5;
    nbd[8] =  texture2D(SamplerEdge, texCoord[8]) * 0.25;

    float sum = 0;
    for(int i=0;i<9;i++) {
        sum+=nbd[i].r;
    }
    sum/=4.0;

    edge = sum;
    edge = 1-(1-edge)*1.4;

    color.xyz = edge*hatch*paper*paperColor;
    
    if(edge.r < -0.5) 
        color.xyz = vec3(1,1,1)*hatch*paper;
    
    gl_FragColor = color;
 }

//frag2buffer composeFragEdge(in vertex2frag interpolant, 
//						uniform sampler2D SamplerHatch,
//						uniform sampler2D SamplerEdge)
//    {
//    vec2 tex = vertOut_fTexCoord0;
//    vec3 edge;
//    vec3 hatch = texture2D(SamplerHatch, tex).xyz;
//    vec3 paper;
//    paper = vec3(1,1,1);
//    vec3 paperColor = vec3(1,1,1);
//    vec4 color = vec4(1,1,1,1);
//    float fInverseGeomMapWidth= 1/2560.0;
//    float fInverseGeomMapHeight= 1/960.0;
//    vec2 texCoord[9];
//
//    texCoord[0*3+0] = tex + vec2(fInverseGeomMapWidth*(-1), fInverseGeomMapHeight*(-1));
//    texCoord[0*3+1] = tex + vec2(fInverseGeomMapWidth*(0), fInverseGeomMapHeight*(-1));
//    texCoord[0*3+2] = tex + vec2(fInverseGeomMapWidth*(1), fInverseGeomMapHeight*(-1));
//    texCoord[1*3+0] = tex + vec2(fInverseGeomMapWidth*(-1), fInverseGeomMapHeight*(0));
//    texCoord[1*3+1] = tex + vec2(fInverseGeomMapWidth*(0), fInverseGeomMapHeight*(0));
//    texCoord[1*3+2] = tex + vec2(fInverseGeomMapWidth*(1), fInverseGeomMapHeight*(0));
//    texCoord[2*3+0] = tex + vec2(fInverseGeomMapWidth*(-1), fInverseGeomMapHeight*(1));
//    texCoord[2*3+1] = tex + vec2(fInverseGeomMapWidth*(0), fInverseGeomMapHeight*(1));
//    texCoord[2*3+2] = tex + vec2(fInverseGeomMapWidth*(1), fInverseGeomMapHeight*(1));
//
//    vec4 nbd[9];
//    nbd[0] =  texture2D(SamplerEdge, texCoord[0]) * 0.25;
//    nbd[1] =  texture2D(SamplerEdge, texCoord[1]) * 0.5;
//    nbd[2] =  texture2D(SamplerEdge, texCoord[2]) * 0.25;
//    nbd[3] =  texture2D(SamplerEdge, texCoord[3]) * 0.5;
//    nbd[4] =  texture2D(SamplerEdge, texCoord[4]);
//    nbd[5] =  texture2D(SamplerEdge, texCoord[5]) * 0.5;
//    nbd[6] =  texture2D(SamplerEdge, texCoord[6]) * 0.25;
//    nbd[7] =  texture2D(SamplerEdge, texCoord[7]) * 0.5;
//    nbd[8] =  texture2D(SamplerEdge, texCoord[8]) * 0.25;
//
//    float sum = 0;
//    for(int i=0;i<9;i++) {
//        sum+=nbd[i].r;
//    }
//	sum/=4.0;
//
//    edge = sum;
//    edge = 1-(1-edge)*1.4;
//
//	color.xyz = edge*hatch*paper*paperColor;
//    
//	if(edge.r <-0.5) 
//		color.xyz = vec3(1,1,1)*hatch*paper;
//	fragOut.color = color;
//    return fragOut;
//}