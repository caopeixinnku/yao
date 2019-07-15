
//agf_include "ctl_sketch_interpolants.glsl"

//agf_include "ctl_sketch_fragment_common.glsl"


/*

uniform sampler2D SamplerDepth;
uniform mat4x4 agf_CameraMVPMatrixInverted;
void main()
{
vec4 clipPosition;

clipPosition.xy = vertOut_fEyePosition.xy;
clipPosition.z = (texture2D(SamplerDepth, vertOut_fTexCoord0.xy).r-0.5)*2.0;
clipPosition.w = 1.0;

vec4 worldPosition = agf_CameraMVPMatrixInverted*clipPosition;

worldPosition = worldPosition / worldPosition.w;
gl_FragColor.rgb = worldPosition.rgb;
//gl_FragColor.rgb = vec3(0, 0, 0);
gl_FragColor.a = 1.0;
}*/

uniform sampler2D SamplerNormal;
uniform sampler2D SamplerPosition;

uniform mat4x4  agf_CameraMVPMatrixInverted;

void main()
{
    mat4x4 mMVP = matrix_inverse(agf_CameraMVPMatrixInverted);
    
    
    vec2 tex	= vertOut_fTexCoord0.xy;
    vec2 tex1	= vec2(tex.x + rayTripleOffset, tex.y);
    vec2 tex2 	= vec2(tex.x, tex.y + rayTripleOffset);
    
    vec4 normalAndDepth0	= texture2D(SamplerNormal, tex);
    vec4 normalAndDepth1	= texture2D(SamplerNormal, tex1);
    vec4 normalAndDepth2	= texture2D(SamplerNormal, tex2);
    
    //if background, no dir
    if(normalAndDepth0.w == 0.0)
        {
        gl_FragColor  = vec4(0,0,0,0);
        return;
        }
    
    //foreground
    COMPUTE_PD_IN pdin;
    
    pdin.normal0	= normalize(texture2D(SamplerNormal, tex).xyz);
    pdin.normal1	= normalize(texture2D(SamplerNormal, tex1).xyz);
    pdin.normal2	= normalize(texture2D(SamplerNormal, tex2).xyz);
    pdin.point0	= texture2D(SamplerPosition,tex).xyz;
    pdin.point1	= texture2D(SamplerPosition,tex1).xyz;
    pdin.point2 	= texture2D(SamplerPosition,tex2).xyz;
    
    COMPUTE_PD_OUT pdout = computePrincipalDirection(pdin);
    
    vec3 wMinDir = pdout.minDir;
    vec3 wMaxDir = pdout.maxDir;
    
    vec4 wNsample = texture2D(SamplerNormal, tex);
    vec4 wP1sample = texture2D(SamplerPosition, tex);
    vec3 wN  = normalize(wNsample.xyz);
    
    ////////////////////////////////////////////////////////////////////
    vec3 wX = normalize(vec3(1,0,0));
    vec3 wY = normalize(vec3(0,1,0));
    vec3 wZ = normalize(vec3(0,0,1));
    ////////////////////////////////////////////////////////////////////
    
    float dotTH = cos(3.141592/2);
    
    float dotX = abs(dot(wN,wX));
    float dotY = abs(dot(wN,wY));
    float dotZ = abs(dot(wN,wZ));
    
    //normal
    // g_defaultDirectionMode
    if(pdout.singularDegree < 0.25) {
        if( abs(dot(wN,wY)) < dotTH) {
            wMinDir = wY;
            if(abs(dot(wN,wZ)) < dotTH)
                wMaxDir = wZ;
            else
                wMaxDir = wX;
        }
        else if( abs(dot(wN,wZ)) < dotTH) {
            wMinDir = wZ;
            if(abs(dot(wN,wX)) < dotTH)
                wMaxDir = wX;
            else
                wMaxDir = wY;
        }
        else if( abs(dot(wN,wX)) < dotTH) {
            wMinDir = wX;
            if(abs(dot(wN,wY)) < dotTH)
                wMaxDir = wY;
            else
                wMaxDir = wZ;
        }
        else {
            wMinDir = normalize(vec3(1,1,0));
            wMaxDir = normalize(vec3(1,-1,0));
        }
        wMinDir = normalize(cross(wN,wMaxDir));
        wMaxDir = normalize(cross(wN,wMinDir));
    }
    else if(pdout.singularDegree < 0.75) {
        wMaxDir = normalize(cross(wN,wMinDir));
    }
    
    
    vec3 wP1 = wP1sample.xyz;
    vec3 wP2 = wP1+wMinDir;
    vec3 wP3 = wP1+wMaxDir;
    
    ////////////////////////////////////////////////////////////
    vec4 clipP1 = mMVP*vec4(wP1,1);
    vec4 clipP2 = mMVP*vec4(wP2,1);
    vec4 clipP3 = mMVP*vec4(wP3,1);
    ////////////////////////////////////////////////////////////
    
    vec2 clipMinDir = clipP2.xy/clipP2.w - clipP1.xy/clipP1.w;
    vec2 clipMaxDir = clipP3.xy/clipP3.w - clipP1.xy/clipP1.w;
    
    if(length(clipMinDir) >0.0) {
        clipMinDir = normalize(clipMinDir);
    }
    else {
        clipMinDir = vec2(1,0);
    }
    if(length(clipMaxDir) >0.0) {
        clipMaxDir = normalize(clipMaxDir);		
    }
    else {
        clipMaxDir = vec2(0,1);
    }
    
    if(clipMinDir.y<0) 
        clipMinDir = -clipMinDir;
    if(clipMaxDir.y<0) 
        clipMaxDir = -clipMaxDir;
    
    clipMinDir.y = -clipMinDir.y;
    clipMaxDir.y = -clipMaxDir.y;
    
    gl_FragColor = vec4(normalize(clipMinDir),normalize(clipMaxDir));

//	 gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
}





