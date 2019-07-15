#extension GL_ARB_shader_texture_lod: require 
#define M_PI						3.1415926535898
#define M_2PI						6.28318530718

/***********************************************************************/
vec2 uvSPHERE(in vec3 iSphereVector)
{
	vec2 uv;
	uv.y = (acos(abs(iSphereVector.y))/M_PI);
	if (iSphereVector.y<0.0) uv.y = 1.0-uv.y;
	uv.x = (atan(iSphereVector.x, iSphereVector.z)+M_PI)/(2.0*M_PI);
	return uv;
}
/***********************************************************************/

vec4 xformTex2D(in sampler2D _texture, in vec4 homogeneousUV, in mat4 uvMatrix)
{
	vec4 xformedUV;
	xformedUV = uvMatrix * homogeneousUV;
	return texture2D(_texture, xformedUV.xy);
}
vec4 xformTex2DProjective(in sampler2D _texture, in vec4 projectedPosition, in mat4 worldToUVProjectionMatrix)
{
	vec4 xformedUV;
	xformedUV =  worldToUVProjectionMatrix * projectedPosition;
	xformedUV = xformedUV/xformedUV.w;
	xformedUV = (xformedUV+vec4(1.0, 1.0, 1.0, 1.0))*vec4(0.5, 0.5, 0.5, 0.5);
	return texture2D(_texture, xformedUV.xy);
}

vec4 xformTex2DProjectiveLOD(in sampler2D _texture, in vec4 projectedPosition, in mat4 worldToUVProjectionMatrix, float iLODlevel)
{
	vec4 xformedUV;
	xformedUV =  worldToUVProjectionMatrix * projectedPosition;
	xformedUV = xformedUV/xformedUV.w;
	xformedUV = (xformedUV+vec4(1.0, 1.0, 1.0, 1.0))*vec4(0.5, 0.5, 0.5, 0.5);
	return texture2DLod(_texture, xformedUV.xy, iLODlevel);
}
 vec4 xformTex2DOffset(in sampler2D _texture, in vec4 homogeneousUV, in mat4 uvMatrix, in vec4 offset)
{
	vec4 xformedUV;
	xformedUV = (uvMatrix * homogeneousUV) + offset;
	return texture2D(_texture, xformedUV.xy);
}

vec4 xformTex3D(in sampler3D _texture, in vec4 homogeneousUV, in mat4 uvMatrix)
{
	vec4 xformedUV;
	xformedUV = uvMatrix * homogeneousUV;
	return texture3D(_texture, xformedUV.xyz);
}
/***********************************************************************/
vec4 texSPHERE(in sampler2D sphereTex, in mat4 textureMatrix, in vec3 lookup_vector)
	{
	vec2 index;
	vec3 reflectDir;
	vec4 sphereColor;
	index = uvSPHERE(lookup_vector);
	vec4 homogeneousUVindex = vec4(index, 0, 1);
	sphereColor = xformTex2D(sphereTex, homogeneousUVindex, textureMatrix);
	return sphereColor;
	}
	
vec4 texSPHEREMULTI(in sampler3D sphereTex, in mat4 textureMatrix, in vec4 sliceAndScale, in vec3 lookup_vector)
{
	vec2 index;
	vec3 reflectDir;
	vec4 sphereColor;
	index = uvSPHERE(lookup_vector);
	vec4 homogeneousUVindex = vec4(index, 1, 1)*sliceAndScale;
	sphereColor = xformTex3D(sphereTex, homogeneousUVindex, textureMatrix);
	return sphereColor;
}

//############################################## LIGHTS AND SHADOWS ################################################

#define USE_SHADOW_PCF 1
#if USE_SHADOW_PCF
#define SHADOW_TEX			sampler2D
#define SHADOW_TEX_DEPTH	sampler2DShadow
#define SHADOW_LOOKUP(x,y) (y)
#define SHADOW_LOOKUP_PCF(x,y) manualPCF(y)
#define SHADOW_LOOKUP_DEPTH(x,y) texture2D(x,y.rg).r
#else
#define SHADOW_TEX			sampler2D
#define SHADOW_LOOKUP(x,y) texture2D(x, y)
#endif
#define ENABLE_IBL

struct InfiniteLight
	{
		vec3		diffuse;
		vec3		specular;
		vec4		position;
#ifdef ENABLE_GL_SHADOWS
		vec4		shadowFactor; //0 -number of texture divisions (reciproc) 1 - shadow softness (normalized) 2 - light source size (Raytracer gets the same thing)
		mat4		worldToShadowMapMatrix;
		mat4		shadowMapToWorldMatrix;
		mat4		localShadowBufferToGlobalShadowBufferUVTransformationMatrix;
		vec4		uvLocalShadowBoundaries;
#endif
	};

struct SpotLight
		{
		vec3		diffuse;
		vec3		specular;
		vec4		position;
		
		vec4		worldPosition;
		
		vec4		direction;
		vec4		angle_cos;
		vec4		attenuation;

#ifdef ENABLE_GL_SHADOWS
		vec4		shadowFactor;
		mat4		worldToShadowMapMatrix;
		mat4		shadowMapToWorldMatrix;
		mat4		localShadowBufferToGlobalShadowBufferUVTransformationMatrix;
		vec4		uvLocalShadowBoundaries;
#endif
		};
	
struct PointLight
		{
		vec3		diffuse;
		vec3		specular;
		vec4		position;

		vec4		worldPosition;
		vec4		attenuation;

#ifdef ENABLE_GL_SHADOWS
		vec4		shadowFactor;
		mat4		worldToShadowMapMatrix[6];
		mat4		shadowMapToWorldMatrix[6];
		mat4		localShadowBufferToGlobalShadowBufferUVTransformationMatrix[6];
		vec4		uvLocalShadowBoundaries[6];
#endif
		};

#ifdef ENABLE_GL_SHADOWS
	struct LightShadow
	{
		vec4		lightSourceWorldPosition;
		vec4		shadowBiases;
		vec4		shadowFactor;
		vec4		angle_cos;
		mat4		worldToShadowMapMatrix;
		mat4		shadowMapToWorldMatrix;
		mat4		localShadowBufferToGlobalShadowBufferUVTransformationMatrix;
		vec4		uvLocalShadowBoundaries;
	};
#endif
// ################################################### SHADOW TERMS' EVALUATORS ###################################################################

float rand(vec2 co)
    {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }



#ifdef ENABLE_GL_SHADOWS
#define PCF16			0
#define PCF4			0
#define PCF4_DITHER	1
#define NO_PCF			0
//#define SHADOW_LOOKUP_BUDGET 256.0
#define SHADOW_BIAS 0.0000001

uniform SHADOW_TEX gShadowMap;
uniform SHADOW_TEX_DEPTH gShadowMapDepth;
uniform vec2		gShadowMapTextureNormalizers;
uniform float gShadowLookupBudget;
uniform float gBBOXDiagonal;
//uniform sampler2DShadow gShadowMap;

float offset_lookup(in vec4 UV, in vec2 offset)
    {
        if (UV.z > 1.0) return 1.0;
        float d = texture2D(gShadowMap, UV.xy+offset*gShadowMapTextureNormalizers).r;
        if (d+SHADOW_BIAS*d<UV.z)
            {
            return 0.0; // In Shadow
            }
        else
            {
            return 1.0; // Not in shadow
            }
    }

float offset_lookup_biased(in vec4 UV, in vec2 offset, in vec4 biases)
{
        if (UV.z > 1.0) return 1.0;
        float d = texture2D(gShadowMap, UV.xy+offset*gShadowMapTextureNormalizers).r;
        float finalBias = biases.x;
		if (d+finalBias<UV.z)
            {
            return 0.0; // In Shadow
            }
        else
            {
            return 1.0; // Not in shadow
            }


}
float manualPCF(in vec4 UV)
{
float sum = 0.0;
#if PCF16
	float x, y;
	for (y=-1.5; y<=1.5; y+=1.0)
		for (x=-1.5; x<=1.5; x+=1.0)
			sum += offset_lookup(UV, vec2(x,y));
	return sum / 16.0;
#elif PCF4_DITHER
	vec2 offset;
	vec2 fracc=gl_FragCoord.xy*0.5 - floor(gl_FragCoord.xy*0.5);
	offset = vec2(fracc.x>0.25, fracc.y>0.25);
	offset.y += offset.x;
	if (offset.y > 1.1)
		offset.y = 0.0;
	sum = 4.0*offset_lookup(UV, offset+vec2(-0.5, -0.5))+offset_lookup(UV, offset+vec2(-1.5, 0.5))+offset_lookup(UV, offset+vec2(0.5, 0.5))+offset_lookup(UV, offset+vec2(-1.5, -1.5))+offset_lookup(UV, offset+vec2(0.5, -1.5));
	return sum * 0.125;
#elif PCF4
	float ks = 0.5;
	sum = 4.0*offset_lookup(UV, vec2(0.0, 0.0)) + offset_lookup(UV, vec2(-ks, -ks))+offset_lookup(UV, vec2(-ks, ks))+offset_lookup(UV, vec2(ks, ks))+offset_lookup(UV, vec2(ks, -ks));
	return sum * 0.125;
#elif NO_PCF
	sum = offset_lookup(UV, vec2(0.0, 0.0));
	return sum;
#endif
}

float manualPCF_biased(in vec4 UV, in vec4 biases)
{
	vec2 offset;
	vec2 fracc=gl_FragCoord.xy*0.5 - floor(gl_FragCoord.xy*0.5);
	offset = vec2(fracc.x>0.25, fracc.y>0.25);
	offset.y += offset.x;
	if (offset.y > 1.1)
		offset.y = 0.0;
	float sum = 4.0*offset_lookup_biased(UV, offset+vec2(-0.5, -0.5), biases)+
			  offset_lookup_biased(UV, offset+vec2(-1.5, 0.5), biases)+
			  offset_lookup_biased(UV, offset+vec2(0.5, 0.5), biases)+
			  offset_lookup_biased(UV, offset+vec2(-1.5, -1.5), biases)+
			  offset_lookup_biased(UV, offset+vec2(0.5, -1.5), biases);
	return sum * 0.125;

}

float gaussianShadowTerm(in vec4 UV, in float texSpaceOffset)
{
	vec4 texNorm = vec4(gShadowMapTextureNormalizers.x, gShadowMapTextureNormalizers.y, 1.0, 1.0);	
	vec4 uv = UV;
	float s = texSpaceOffset;
	vec4 uv00 = UV-texNorm*vec4(s, 0.0, 0.0, 0.0);
	vec4 uv01 = UV+texNorm*vec4(s, 0.0, 0.0, 0.0);
	vec4 uv10 = UV+texNorm*vec4(0.0, s, 0.0, 0.0);
	vec4 uv11 = UV-texNorm*vec4(0.0, s, 0.0, 0.0);
	
	
	vec4 uv200 = UV+texNorm*vec4(-s, -s,0.0, 0.0);
	vec4 uv201 = UV+texNorm*vec4(-s, +s,0.0, 0.0);
	vec4 uv210 = UV+texNorm*vec4(+s, -s,0.0, 0.0);
	vec4 uv211 = UV+texNorm*vec4(+s, +s,0.0, 0.0);
	
	float totalDepth = 0.0;
	
	float depthInShadowBuffer;
	depthInShadowBuffer = SHADOW_LOOKUP_PCF(gShadowMap, uv);

	totalDepth += depthInShadowBuffer * 0.25;
		
	const vec4 sideWeight = vec4(0.125, 0.125, 0.125, 0.125);

	depthInShadowBuffer = SHADOW_LOOKUP_PCF(gShadowMap, uv00);
		totalDepth += depthInShadowBuffer * sideWeight.x;
		
	depthInShadowBuffer = SHADOW_LOOKUP_PCF(gShadowMap, uv01);
		totalDepth += depthInShadowBuffer * sideWeight.x;

	depthInShadowBuffer = SHADOW_LOOKUP_PCF(gShadowMap, uv10);
		totalDepth += depthInShadowBuffer * sideWeight.x;


	depthInShadowBuffer = SHADOW_LOOKUP_PCF(gShadowMap, uv11);
		totalDepth += depthInShadowBuffer * sideWeight.x;


	
	
	const vec4 cornerWeight = vec4(0.0625, 0.0625, 0.0625, 0.0625);
	
	depthInShadowBuffer = SHADOW_LOOKUP_PCF(gShadowMap, uv200);

		totalDepth += depthInShadowBuffer * cornerWeight.x;
		
	depthInShadowBuffer = SHADOW_LOOKUP_PCF(gShadowMap, uv201);

		totalDepth += depthInShadowBuffer * cornerWeight.x;
	
	depthInShadowBuffer = SHADOW_LOOKUP_PCF(gShadowMap, uv210);

		totalDepth += depthInShadowBuffer * cornerWeight.x;

	depthInShadowBuffer = SHADOW_LOOKUP_PCF(gShadowMap, uv211);

		totalDepth += depthInShadowBuffer * cornerWeight.x;

	return totalDepth;	
}

float depthLookup(in vec4 iUV, in vec4 uvBoundaries)
{
	float depth=1.0;
	vec2 clamped_iUV = clamp(iUV.xy, uvBoundaries.xy, uvBoundaries.zw);
	bool inside0 = (iUV.x == clamped_iUV.x);
	bool inside1 = (iUV.y == clamped_iUV.y);
	bool insideBoth = (inside0 && inside1);
	vec4 uv = vec4(clamped_iUV.x, clamped_iUV.y, 0.0, 1.0);
	if (insideBoth)
		{
		depth = SHADOW_LOOKUP_DEPTH(gShadowMap, iUV);
		}
	
	return depth;
}

#define agf_min min
float findMinDepth(in vec4 iUV, in float texSpaceOffset,in vec4 uvBoundaries)
{
	vec4 texNorm = vec4(gShadowMapTextureNormalizers.x*texSpaceOffset, gShadowMapTextureNormalizers.y*texSpaceOffset, 1.0, 1.0);	
	vec4 shadowTerm;
	float depthInShadowBuffer;
	vec4 uv = iUV;
	vec4 uv00 = iUV-texNorm*vec4(1.0, 0.0, 0.0, 0.0);
	vec4 uv01 = iUV+texNorm*vec4(1.0, 0.0, 0.0, 0.0);
	vec4 uv10 = iUV+texNorm*vec4(0.0, 1.0, 0.0, 0.0);
	vec4 uv11 = iUV-texNorm*vec4(0.0, 1.0, 0.0, 0.0);
	
	
	vec4 uv200 = iUV+texNorm*vec4(-1.0, -1.0, 0.0, 0.0);
	vec4 uv201 = iUV+texNorm*vec4(-1.0, +1.0, 0.0, 0.0);
	vec4 uv210 = iUV+texNorm*vec4(+1.0, -1.0, 0.0, 0.0);
	vec4 uv211 = iUV+texNorm*vec4(+1.0, +1.0, 0.0, 0.0);
	
	shadowTerm = vec4(0.0, 0.0, 0.0, 0.0);
	depthInShadowBuffer = 1.0;

	depthInShadowBuffer = agf_min(depthInShadowBuffer, depthLookup(uv00, uvBoundaries));
	depthInShadowBuffer = agf_min(depthInShadowBuffer, depthLookup(uv01, uvBoundaries));
	depthInShadowBuffer = agf_min(depthInShadowBuffer, depthLookup(uv10, uvBoundaries));
	depthInShadowBuffer = agf_min(depthInShadowBuffer, depthLookup(uv11, uvBoundaries));

	depthInShadowBuffer = agf_min(depthInShadowBuffer, depthLookup(uv200, uvBoundaries));
	depthInShadowBuffer = agf_min(depthInShadowBuffer, depthLookup(uv201, uvBoundaries));
	depthInShadowBuffer = agf_min(depthInShadowBuffer, depthLookup(uv210, uvBoundaries));
	depthInShadowBuffer = agf_min(depthInShadowBuffer, depthLookup(uv211, uvBoundaries));
		
	return depthInShadowBuffer;
}


vec4 GaussianPointOnDisk( in float radius, in float fudger )
	{
	float x1 = rand(gl_FragCoord.xy+vec2(fudger*M_PI, fudger*M_2PI))+0.0001;
	float x2 = rand(gl_FragCoord.xy+vec2(fudger*(M_PI+0.7), fudger*(M_2PI+0.7)));

	x1 = clamp(x1, 0.0001, 0.9999999);

	float r = radius * sqrt(-2.0 * log(x1));
	float t = x2 * M_2PI;

	return vec4( r*cos(t), r*sin(t), x1, 0.0 );
	}


#if ENABLE_GL_SOFT_SHADOWS
float softShadowTerm(in vec4 UV, in float boxKernelSize,in vec4 uvBoundaries, in vec4 biases)
{
	float x,y;
	float k = boxKernelSize/2.0;
    
    if (k<0.5)
        {
        float hardShadowLookup = manualPCF_biased(UV, biases);
        return 1.0-hardShadowLookup;
        }
    
    float shadowTerm = 0.0;
	float gaussWeightTotal = 0.0;
	float gaussWeight = 0.0;
	vec4 texNorm = vec4(gShadowMapTextureNormalizers.x, gShadowMapTextureNormalizers.y, 0.0, 0.0);	
	vec4 uv = UV;
	float i = 0;
	for (float i = 0;i<SOFT_SHADOW_LOOKUP_BUDGET_PER_BUFFER;i++)
		{
		vec4 gaussianPoint = GaussianPointOnDisk(k, i);
		gaussWeight = gaussianPoint.z;
		uv = UV + gaussianPoint*texNorm;
		uv.xy = clamp(uv.xy, uvBoundaries.xy, uvBoundaries.zw);
		shadowTerm += (gaussWeight*manualPCF_biased(uv, biases));
		gaussWeightTotal += gaussWeight;
		}

	if (gaussWeightTotal>0.0)
		shadowTerm /= gaussWeightTotal; 
	else
		return 0.0; 

	return 1.0-shadowTerm;
}
float SoftShadowLookup(in vec4 UV, float softness, in vec4 uvBoundaries, in vec4 biases)
{
	float localToGlobal=abs(uvBoundaries.z-uvBoundaries.x);
	float maxRadius = 0.1*(1.0/gShadowMapTextureNormalizers.x);
	float kernelRadius = softness*(1.0/gShadowMapTextureNormalizers.x)*localToGlobal;

	float shadowTermScalar = softShadowTerm(UV, kernelRadius, uvBoundaries, biases);
	return shadowTermScalar;
}

#endif

#if USE_SHADOW_PCF
float ShadowLookup(vec4 geomPointInShadowSpace, in vec4 biases)
{
 	float shadowTerm;
	shadowTerm = manualPCF_biased(geomPointInShadowSpace, biases);
	return 1.0-shadowTerm;
} 
#else
float ShadowLookup(vec4 geomPointInShadowSpace)
{
	float depthInShadowSpace =  geomPointInShadowSpace.z; 
	float depthInShadowBuffer = SHADOW_LOOKUP(gShadowMap, geomPointInShadowSpace.xy).x; 
				
 	float shadowTerm = 0.0;
 	
 	if (depthInShadowSpace <= 1.0 && depthInShadowSpace > depthInShadowBuffer)
		{
		shadowTerm = 1.0;		
		}
	return shadowTerm;
} 
#endif

	
vec4 EvaluateShadow(in vec4 iGeomPointInWorldSpace, in LightShadow iLightSource)
	{
	vec4 geomPointInShadowSpace = iLightSource.worldToShadowMapMatrix * iGeomPointInWorldSpace;
	vec4 biases = iLightSource.shadowBiases;
	geomPointInShadowSpace.xyz = geomPointInShadowSpace.xyz*(1.0/geomPointInShadowSpace.w);
	geomPointInShadowSpace.xyz = (geomPointInShadowSpace.xyz+vec3(1.0, 1.0, 1.0))*vec3(0.5, 0.5, 0.5);
	
	float depthInShadowSpace =  geomPointInShadowSpace.z;
	
	vec4 geomPointInGlobalShadowSpaceSource = vec4(geomPointInShadowSpace.xy, 0.0, 1.0);
	vec4 geomPointInGlobalShadowSpace = iLightSource.localShadowBufferToGlobalShadowBufferUVTransformationMatrix * geomPointInGlobalShadowSpaceSource;

	geomPointInGlobalShadowSpace.z = geomPointInShadowSpace.z;
	geomPointInGlobalShadowSpace.w = 1.0;
	float depthInShadowBuffer;
	vec4 shadowTerm=vec4(0.0, 0.0, 0.0, 0.0);
#if ENABLE_GL_SOFT_SHADOWS
	//We need to compute penumbra size, approximate.
	float softness = iLightSource.shadowFactor.y;
	//float shadowTermScalar = SoftShadowLookup(geomPointInGlobalShadowSpace, softness, iLightSource.uvLocalShadowBoundaries, biases);
	//shadowTerm = vec4(shadowTermScalar);
	float penumbraSize = 0.0; 
	//Estimating penumbra size, as described in http://developer.download.nvidia.com/shaderlibrary/docs/shadow_PCSS.pdf
		//Point lights and spotlights, here we go.

		//Find out the point of shadow Caster.
		float occluderZ = depthLookup(geomPointInGlobalShadowSpace, iLightSource.uvLocalShadowBoundaries); //SHADOW_LOOKUP(iLightSource.shadowMap, geomPointInGlobalShadowSpace.xy).x;
		float heisenbergShading = 0.0;
		float relativeDistance = 0.0;
		if (abs(occluderZ - 1.0)<1.0e-7)
			{
			//We might be in Penumbra;
			//Search the neighborhood
			occluderZ = findMinDepth(geomPointInGlobalShadowSpace, 64.0*iLightSource.shadowFactor.x, iLightSource.uvLocalShadowBoundaries);
			}
		if (occluderZ < 1.0)
			{
			vec4 occluderPointInShadowSpace = vec4(geomPointInShadowSpace.xy, occluderZ,1);
			occluderPointInShadowSpace.xyz = (occluderPointInShadowSpace.xyz-vec3(0.5, 0.5, 0.5))*vec3(2.0, 2.0, 2.0);
			vec4 occluderPointInWorldSpace = iLightSource.shadowMapToWorldMatrix * occluderPointInShadowSpace;
			
			//Dont forget the perspective divide
			occluderPointInWorldSpace.xyz = occluderPointInWorldSpace.xyz*(1.0/occluderPointInWorldSpace.w);
			
				float dReceiver = length(iGeomPointInWorldSpace.xyz - iLightSource.lightSourceWorldPosition.xyz);
				float dBlocker = length(occluderPointInWorldSpace.xyz - iLightSource.lightSourceWorldPosition.xyz);
				relativeDistance = (dReceiver - dBlocker) / dBlocker;
				float penumbraWorldSize = 0.0; 
			if (iLightSource.lightSourceWorldPosition.w > 0.5)
				{	 
				penumbraWorldSize = ((dReceiver - dBlocker) * iLightSource.shadowFactor.z) / dBlocker;		
				float zNear = iLightSource.angle_cos[2]; //1/tan(halfangle)
				
				float pS = (penumbraWorldSize*zNear)/dReceiver;
				penumbraSize = pS*0.5;//pS;//*iLightSource.shadowFactor.x*((1.0/gShadowMapTextureNormalizers.x)/2.0);
				}
			else
				{
				float dBlockerReceiverDistance = length(iGeomPointInWorldSpace.xyz - occluderPointInWorldSpace.xyz);
				penumbraSize = iLightSource.shadowFactor.z*1.15*dBlockerReceiverDistance;//*iLightSource.shadowFactor.x;
				}
				
			float shadowTermScalar = 0.0;

            shadowTermScalar = SoftShadowLookup(geomPointInGlobalShadowSpace, penumbraSize, iLightSource.uvLocalShadowBoundaries, biases);
			shadowTerm = vec4(shadowTermScalar);
			}
 	


#else
	
	float shadowTermRatio = ShadowLookup(geomPointInGlobalShadowSpace, biases);
 	shadowTerm = vec4(shadowTermRatio);
#endif
	
	
 
 	
 	if (depthInShadowSpace > 1.0 || geomPointInShadowSpace.x < 0.0 || geomPointInShadowSpace.x > 1.0 || geomPointInShadowSpace.y < 0.0 || geomPointInShadowSpace.y > 1.0)
 		{
 		shadowTerm = vec4(0.0, 0.0, 0.0, 0.0);
 		}
 
  	if (depthInShadowSpace < 0.0)
  		{
  		shadowTerm = vec4(0.0, 0.0, 0.0, 0.0);
  		}
  	
  	shadowTerm = shadowTerm * iLightSource.shadowFactor.w;
  		
	return	shadowTerm;
	}
	
vec4 EvaluateShadowTermForInfiniteLight(in vec4 geomPointInWorldSpace, in InfiniteLight lightSource, in vec4 iShadowBiases)
	{
		LightShadow shadowData;
		shadowData.shadowFactor = lightSource.shadowFactor;
		shadowData.shadowBiases = iShadowBiases;
		shadowData.worldToShadowMapMatrix = lightSource.worldToShadowMapMatrix;
		shadowData.shadowMapToWorldMatrix = lightSource.shadowMapToWorldMatrix;
#if ENABLE_GL_SOFT_SHADOWS
		shadowData.lightSourceWorldPosition = vec4(0.0, 0.0, 0.0, 0.0);
		shadowData.uvLocalShadowBoundaries = lightSource.uvLocalShadowBoundaries;
#endif
		shadowData.localShadowBufferToGlobalShadowBufferUVTransformationMatrix = lightSource.localShadowBufferToGlobalShadowBufferUVTransformationMatrix;
		vec4 shadowTerm = EvaluateShadow(geomPointInWorldSpace, shadowData);
		return shadowTerm;
	}
	
	vec4 EvaluateShadowTermForSpotLight(in vec4 geomPointInWorldSpace, in SpotLight lightSource, in vec4 iShadowBiases)
	{
		LightShadow shadowData;
		shadowData.shadowFactor = lightSource.shadowFactor;
		shadowData.shadowBiases = iShadowBiases;
		shadowData.angle_cos = lightSource.angle_cos;
		shadowData.worldToShadowMapMatrix = lightSource.worldToShadowMapMatrix;
		shadowData.shadowMapToWorldMatrix = lightSource.shadowMapToWorldMatrix;
		shadowData.localShadowBufferToGlobalShadowBufferUVTransformationMatrix = lightSource.localShadowBufferToGlobalShadowBufferUVTransformationMatrix;
#if ENABLE_GL_SOFT_SHADOWS
		shadowData.lightSourceWorldPosition = lightSource.worldPosition;
		shadowData.uvLocalShadowBoundaries = lightSource.uvLocalShadowBoundaries;
#endif
		vec4 shadowTerm = EvaluateShadow(geomPointInWorldSpace, shadowData);
		return shadowTerm;
	}	

	vec4 EvaluateShadowTermForPointLight(in vec4 geomPointInWorldSpace, in PointLight lightSource, in vec4 iShadowBiases)
	{
		LightShadow shadowData;
		shadowData.shadowFactor = lightSource.shadowFactor;
		shadowData.shadowBiases = iShadowBiases;
		shadowData.angle_cos[2] = 1.0;
#if ENABLE_GL_SOFT_SHADOWS
		shadowData.lightSourceWorldPosition = lightSource.worldPosition;
#endif
		vec4 shadowTerm;
		vec4 finalShadowTerm=vec4(0.0, 0.0, 0.0, 0.0);
		int s;
		//for (s=0;s<6;s++)
			{
			shadowData.worldToShadowMapMatrix = lightSource.worldToShadowMapMatrix[0];
			shadowData.shadowMapToWorldMatrix = lightSource.shadowMapToWorldMatrix[0];
			shadowData.uvLocalShadowBoundaries = lightSource.uvLocalShadowBoundaries[0];
			shadowData.localShadowBufferToGlobalShadowBufferUVTransformationMatrix = lightSource.localShadowBufferToGlobalShadowBufferUVTransformationMatrix[0];
			shadowTerm = EvaluateShadow(geomPointInWorldSpace, shadowData);
			finalShadowTerm = finalShadowTerm + shadowTerm;
	
			shadowData.worldToShadowMapMatrix = lightSource.worldToShadowMapMatrix[1];
			shadowData.shadowMapToWorldMatrix = lightSource.shadowMapToWorldMatrix[1];
			shadowData.uvLocalShadowBoundaries = lightSource.uvLocalShadowBoundaries[1];
			shadowData.localShadowBufferToGlobalShadowBufferUVTransformationMatrix = lightSource.localShadowBufferToGlobalShadowBufferUVTransformationMatrix[1];
			shadowTerm = EvaluateShadow(geomPointInWorldSpace, shadowData);
			finalShadowTerm = finalShadowTerm + shadowTerm;
	
			shadowData.worldToShadowMapMatrix = lightSource.worldToShadowMapMatrix[2];
			shadowData.shadowMapToWorldMatrix = lightSource.shadowMapToWorldMatrix[2];
			shadowData.uvLocalShadowBoundaries = lightSource.uvLocalShadowBoundaries[2];
			shadowData.localShadowBufferToGlobalShadowBufferUVTransformationMatrix = lightSource.localShadowBufferToGlobalShadowBufferUVTransformationMatrix[2];
			shadowTerm = EvaluateShadow(geomPointInWorldSpace, shadowData);
			finalShadowTerm = finalShadowTerm + shadowTerm;
	
			shadowData.worldToShadowMapMatrix = lightSource.worldToShadowMapMatrix[3];
			shadowData.shadowMapToWorldMatrix = lightSource.shadowMapToWorldMatrix[3];
			shadowData.uvLocalShadowBoundaries = lightSource.uvLocalShadowBoundaries[3];
			shadowData.localShadowBufferToGlobalShadowBufferUVTransformationMatrix = lightSource.localShadowBufferToGlobalShadowBufferUVTransformationMatrix[3];
			shadowTerm = EvaluateShadow(geomPointInWorldSpace, shadowData);
			finalShadowTerm = finalShadowTerm + shadowTerm;
	
			shadowData.worldToShadowMapMatrix = lightSource.worldToShadowMapMatrix[4];
			shadowData.shadowMapToWorldMatrix = lightSource.shadowMapToWorldMatrix[4];
			shadowData.uvLocalShadowBoundaries = lightSource.uvLocalShadowBoundaries[4];
			shadowData.localShadowBufferToGlobalShadowBufferUVTransformationMatrix = lightSource.localShadowBufferToGlobalShadowBufferUVTransformationMatrix[4];
			shadowTerm = EvaluateShadow(geomPointInWorldSpace, shadowData);
			finalShadowTerm = finalShadowTerm + shadowTerm;
	
			shadowData.worldToShadowMapMatrix = lightSource.worldToShadowMapMatrix[5];
			shadowData.shadowMapToWorldMatrix = lightSource.shadowMapToWorldMatrix[5];
			shadowData.uvLocalShadowBoundaries = lightSource.uvLocalShadowBoundaries[5];
			shadowData.localShadowBufferToGlobalShadowBufferUVTransformationMatrix = lightSource.localShadowBufferToGlobalShadowBufferUVTransformationMatrix[5];
			shadowTerm = EvaluateShadow(geomPointInWorldSpace, shadowData);
			finalShadowTerm = finalShadowTerm + shadowTerm;
			}
		return finalShadowTerm;
	}	
#endif


vec4 GetShadowBiases(in vec3 normal, in vec3 light)
{
 float cos_alpha = max (0.0, (dot(normal, light))); 
 float offset_scale_N = sqrt(1 - cos_alpha*cos_alpha); // sin(acos(ndotl)) 
 float offset_scale_L = offset_scale_N / cos_alpha; // tan(acos(ndotl)) 
 //return vec4(offset_scale_N, min(1, offset_scale_L), 0.0, 0.0);
 return vec4(0.000004*offset_scale_N, 0.0 , 0.0, 0.0);

}

// #################################################### LIGHTS EVALUATORS (USE SHADOW EVALUATORS IF SHADOWS ARE ENABLED)###########################
void EvaluateInfiniteLight(	in vec3				normal, 	
							in vec3				ecPosition3,
							in InfiniteLight	lightSource,
							inout vec3			diffuse, 
							inout vec3			specular,
							inout vec3			diffuseNoShadow,
							in float			shininess,
							in mat4				iEyeToWorldMatrix,
							in float			iNoiseTexture) 
	{
		float nDotVP;
		vec3 light = normalize(lightSource.position.xyz);

		vec3 diffuse_coeff, specular_coeff;
		diffuse_coeff = lightSource.diffuse;
		specular_coeff = lightSource.specular;
		float brightness_factor=1.0;
		
#ifdef ENABLE_GL_SHADOWS
			vec4 shadowBiases = GetShadowBiases(normal, light);
			vec4 geomPointInEyeSpace = vec4(-ecPosition3, 1.0);
//			vec3 fudgeDistance=vec3(0.001*gBBOXDiagonal);
//			geomPointInEyeSpace.xyz += fudgeDistance*normal;
			vec4 geomPointInWorldSpace = iEyeToWorldMatrix * geomPointInEyeSpace;

			vec4 shadowTerm = EvaluateShadowTermForInfiniteLight(geomPointInWorldSpace, lightSource, shadowBiases);
 			if (shadowTerm.a > 0.0)
 				{
 				brightness_factor = 1.0-shadowTerm.a;
 				}
#endif
		nDotVP = max (0.0, (dot(normal, light)));

		diffuseNoShadow += diffuse_coeff * nDotVP;

		diffuse_coeff *= brightness_factor;
		specular_coeff *= brightness_factor;
		diffuse += diffuse_coeff * nDotVP;
#ifdef ENABLE_SPECULAR_HIGHLIGHTS
		{
			float nDotHV, pf;
			vec3 halfVect = normalize(light+normalize(ecPosition3));
			nDotHV = max (0.0, dot(normal, halfVect));
			pf = pow(nDotHV, shininess);
			specular += specular_coeff * pf;
		}
#endif
	}


	void EvaluatePointLight(in vec3			normal, 	
							in vec3			ecPosition3,
							in PointLight	lightSource,
							inout vec3		diffuse, 
							inout vec3		specular,
							inout vec3		diffuseNoShadow,
							in float		shininess,
							in mat4			iEyeToWorldMatrix, 
							in float		iNoiseTexture) 
	{
		float nDotVP;
		vec3 light = normalize(lightSource.position.xyz + ecPosition3);
		vec3 diffuse_coeff, specular_coeff;
		diffuse_coeff = lightSource.diffuse;
		specular_coeff = lightSource.specular;
		float brightness_factor=1.0;
#ifdef ENABLE_ATTENUATION
		float distance = length(lightSource.position.xyz + ecPosition3);
		if (lightSource.attenuation[0]>0.5)
			{
			float attenuation_factor = 1.0-smoothstep(lightSource.attenuation[1], lightSource.attenuation[2], distance);
			brightness_factor *= attenuation_factor;
			}
#endif
		nDotVP = max (0.0, (dot(normal, light)));
		diffuseNoShadow += diffuse_coeff * brightness_factor* nDotVP;

#ifdef ENABLE_GL_SHADOWS
			vec4 shadowBiases = GetShadowBiases(normal, light);
			vec4 geomPointInEyeSpace = vec4(-ecPosition3, 1.0);
			vec4 geomPointInWorldSpace = iEyeToWorldMatrix * geomPointInEyeSpace;

			vec4 shadowTerm = EvaluateShadowTermForPointLight(geomPointInWorldSpace, lightSource, shadowBiases);
 			if (shadowTerm.a > 0.0)
 				{
 				brightness_factor = 1.0-shadowTerm.a;
 				}
#endif
		diffuse_coeff *= brightness_factor;
		specular_coeff *= brightness_factor;
		diffuse += diffuse_coeff * nDotVP;
#ifdef ENABLE_SPECULAR_HIGHLIGHTS
		float nDotHV, pf;
		vec3 halfVect = normalize(light+normalize(ecPosition3));
		nDotHV = max (0.0, dot(normal, halfVect));
		pf = pow(nDotHV, shininess);
		specular += specular_coeff * pf;
#endif
	}

	void EvaluateSpotLight(	in vec3			normal, 	
							in vec3			ecPosition3,
							in SpotLight		lightSource,
							inout vec3		diffuse, 
							inout vec3		specular,
							inout vec3		diffuseNoShadow,
							in float			shininess,
							in mat4			iEyeToWorldMatrix,
							in float			iNoiseTexture) 
	{
		float nDotVP;
		vec3 light = normalize(lightSource.position.xyz + ecPosition3);
		vec3 diffuse_coeff, specular_coeff;
		diffuse_coeff = lightSource.diffuse;
		specular_coeff = lightSource.specular;
		float brightness_factor=1.0;
#ifdef ENABLE_ATTENUATION
		float distance = length(lightSource.position.xyz + ecPosition3);
		if (lightSource.attenuation[0]>0.5)
			{
			float attenuation_factor = 1.0-smoothstep(lightSource.attenuation[1], lightSource.attenuation[2], distance);
			brightness_factor *= attenuation_factor;
			}
#endif
		vec3 light_axis = -normalize(lightSource.direction.xyz - lightSource.position.xyz); //Should be already normalized in the app
		float angle_dot = dot(light, light_axis);

		float angular_brightness_value = 1.0;
#ifdef ENABLE_ANGULAR_FALOFF
		if (lightSource.attenuation[3]>0.0)
			{
			float faloff_power = lightSource.attenuation[3];
			float deltaAngle = (lightSource.angle_cos[3]-acos(angle_dot))/(lightSource.angle_cos[3]);
			
			float alpha = lightSource.angle_cos[3];
			float cos_alpha = lightSource.angle_cos[0];
			
			float offset = cos_alpha;
			float scale = 1.0/(1.0-cos_alpha);
			float x = (angle_dot-offset)*(scale);
			

			//This will generate an angular falloff, inherited from Lighting Effects spotlight. -Nikolai, 03/31/2011
			//faloff power is in range of 0.25 to 3.0
			//To see the shape of the resulting lobe, you can input this into http://wolframalpha.com
			// Plot [Cos[2 (Pi/4) (ArcCos[x]/(Pi/4))^0.25], {x, 0.707, 1}, {y, 0, 1}] (for total cone angle of Pi/2, and faloff_power of 0.25) (0.707 = cos (PI/4))
			float a = angle_dot;// cos_alpha+(1-cos_alpha)*x;
			float b = acos(a)*2.0;
			float c = b/(alpha*2.0);
			float d = pow(c, faloff_power);
			float e = d*alpha*2.0;
			float f = cos(e); 
			angular_brightness_value = f;
			if ((deltaAngle)<0.0)
				{
				angular_brightness_value = 0.0;
				}
			}
		else
			{
			angular_brightness_value=smoothstep(lightSource.angle_cos.r, lightSource.angle_cos.g, angle_dot);
			}
#else
		angular_brightness_value=smoothstep(lightSource.angle_cos.r, lightSource.angle_cos.g, angle_dot);
#endif
	
		brightness_factor *= angular_brightness_value;
			
		nDotVP = max (0.0, (dot(normal, light)));
		brightness_factor = max (0.0, brightness_factor);
		diffuseNoShadow += diffuse_coeff * brightness_factor* nDotVP;
#ifdef ENABLE_GL_SHADOWS
			vec4 shadowBiases = GetShadowBiases(normal, light);
			vec4 geomPointInEyeSpace = vec4(-ecPosition3, 1.0);
			vec4 geomPointInWorldSpace = iEyeToWorldMatrix * geomPointInEyeSpace;

			vec4 shadowTerm = EvaluateShadowTermForSpotLight(geomPointInWorldSpace, lightSource, shadowBiases);
 			if (shadowTerm.a > 0.00)
 				{
 				brightness_factor = 1.0-shadowTerm.a;
 				}
#endif
		diffuse_coeff *= brightness_factor;
		specular_coeff *= brightness_factor;
		diffuse += diffuse_coeff * nDotVP;
#ifdef ENABLE_SPECULAR_HIGHLIGHTS
		float nDotHV, pf;
		vec3 halfVect = normalize(light+normalize(ecPosition3));
		nDotHV = max (0.0, dot(normal, halfVect));
		pf = pow(nDotHV, shininess);
		specular += specular_coeff * pf;
#endif
	}


//############################################## MATERIAL ##########################################################
struct Material 
	{
	vec4	Ke;
	vec4	Ka;
	vec4	Kd;
	vec4	Ks;
	vec4	selfillum;
	float	shininess;
	float	reflectivity;
	float	opacity;
	vec4	le_params;
	float	ior;
	};

float PerlinNoise3D(	in sampler3D		volumeNoiseTexture, 	
							in vec3				xyz,
							in vec4				params)
	{
	float val,sum, scale;
	vec3 p=xyz;
	float alpha=params[0];
	float beta=params[1];
	float n=params[2];
	sum = 0.0;
	scale = 1.0;
   int i = 0;
	for (i=0;i<int(n);i++)
            {
            val = texture3D(volumeNoiseTexture, p).x;
            sum += val / scale;
            scale *= alpha;
			 p = p*beta;
            }
   return sum;
	}


