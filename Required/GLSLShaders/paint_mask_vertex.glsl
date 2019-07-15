
//agf_include "core_vertex.glsl"

//agf_include "main_vertex2fragment.glsl"

uniform mat4x4 modelViewProj;
uniform mat4x4 modelView;

uniform vec2    uivScreenSize;
uniform vec4    uivTextureSize;

void main()
    {


    vec4 vPosition =		AGFVS_VERTEX();
    vec4 vNormal =			AGFVS_NORMAL();
    vec4 vFaceTangent =		AGFVS_TANGENT();
    vec4 vFaceBinormal =	AGFVS_BINORMAL();

#ifdef GPU_SKINNING
    if (agf_bonecount > 0)
        {
        vPosition = SkinVertex(vPosition);
        vNormal = SkinDirection(vNormal);
        vFaceTangent = SkinDirection(vFaceTangent);
        vFaceBinormal = SkinDirection(vFaceBinormal);
        }
#endif

    float fadeMinThreshold=uivTextureSize[2];
    float fadeMaxThreshold=uivTextureSize[3];


    vec4 clipPosition = modelViewProj * vPosition;

    vertOut_vPosition = (modelView*vPosition).xyz;

 



    vec3 normalVec;
    vec3 ecPosition3 = (vertOut_vPosition.xyz);
    vec4 v1 = vPosition+vNormal;
    v1.w = 1.0;
    vec3 ecPosition3_1 = (modelView*v1).xyz;

    normalVec = normalize(ecPosition3_1-ecPosition3);
    float paintFaloff = abs(normalVec.z);
    float paintFalloffTransfer=1.0-smoothstep(fadeMaxThreshold, fadeMinThreshold, paintFaloff);


    vec4 P = vPosition;
    P.w = 1.0;
    vec4 P1T = vPosition+vFaceTangent*0.5*0.01;
    P1T.w = 1.0;
    vec4 P1B = vPosition+vFaceBinormal*0.5*0.01;
    P1B.w = 1.0;
    vec4 P0T = vPosition-vFaceTangent*0.5*0.01;
    P0T.w = 1.0;
    vec4 P0B = vPosition-vFaceBinormal*0.5*0.01;
    P0B.w = 1.0;
    //vec4 projP = mul(modelViewProj, P);
    vec4 projP0T = modelViewProj*P0T;
    vec4 projP0B = modelViewProj*P0B;
    vec4 projP1T = modelViewProj*P1T;
    vec4 projP1B = modelViewProj*P1B;

    vec2 pP0T = projP0T.xy/projP0T.w;
    vec2 pP1T = projP1T.xy/projP1T.w;
    vec2 pP0B = projP0B.xy/projP0B.w;
    vec2 pP1B = projP1B.xy/projP1B.w;
        
    vec2 dSdu = (pP1T-pP0T)*vec2(100*0.5, 100*0.5)*(uivScreenSize/uivTextureSize.xx);
    vec2 dSdv = (pP1B-pP0B)*vec2(100*0.5, 100*0.5)*(uivScreenSize/uivTextureSize.yy);
    //	vec4 tu = mul(modelViewIT, app.vFaceTangent);
    //	vec4 tv = mul(modelViewIT, app.vFaceBinormal);
    //	dSdu = tu.xy/tu.w;
    //	dSdv = tv.xy/tv.w;
    //Compute eigenvalues;
    float a = dSdu.x;
    float b = dSdv.x;
    float c = dSdu.y;
    float d = dSdv.y;
    float sqD = sqrt((a-d)*(a-d)+4*b*c);
    float lambda_min = abs((a+d-sqD)*0.5);
    float temp_swap = lambda_min;
    float lambda_max = abs((a+d+sqD)*0.5);
    if (lambda_min>lambda_max)
        {
        lambda_min = lambda_max;
        lambda_max = temp_swap;
        }
    float factor = 0;
    float threshold_factor = 4.0;
    vec3 heatmap_color = vec3(1, 0, 0);
    if (lambda_max<1)
        {	//Oversample case:
        factor = 1.0/lambda_min;
        heatmap_color = vec3(1, 0, 0);
        }
    if (lambda_min>1)
        {	//Undersample case:
        factor = lambda_max;
        heatmap_color = vec3(0, 0, 1);
        }
    float t = (factor-1)/(threshold_factor-1);
    float transfer_t;
    transfer_t = smoothstep(0.5, 1.0, t);
    float combined_metric_t = 1.0 - (1.0-transfer_t)*(1.0-paintFalloffTransfer);
    vec3 metric = mix(vec3(1, 1, 1), heatmap_color, combined_metric_t);
    //metric.rg = (P1.xy+vec2(1, 1))*(vec2(0.5, 0.5));
    //metric.b = 0;
    vertOut_Color = metric;
        
    gl_Position = clipPosition;
    }
