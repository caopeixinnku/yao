
//agf_include "core_vertex.glsl"

//agf_include "main_vertex2fragment.glsl"


uniform mat4 modelViewProj;
uniform mat4 modelView;
uniform mat4 modelViewIT;
uniform vec3 normalMultiplier;

void main()
	{
		vec4 vPosition =		AGFVS_VERTEX();
		vec4 vNormal =			AGFVS_NORMAL();
		vec4 vColor =			AGFVS_COLOR();


		vertOut_fClipPosition = modelViewProj * vPosition;
		vec4 normalVecMesh = vNormal;
		normalVecMesh.w = 0.0;
		vec4 normalVecEye = modelViewIT*normalVecMesh;
		vec3 normalVecEye3 = vec3(normalVecEye.x, normalVecEye.y, normalVecEye.z);
		vec3 normalVecEyeNormalized = normalize(normalVecEye3);
		
		vec3 normalVec = normalVecEyeNormalized * normalMultiplier; //To flip the normal if necessary

//		vertOut_fTexCoord0.xy = vTexCoord0.xy;
//		vertOut_fTexCoord0.z = 0.0;
//		vertOut_fTexCoord0.w = 1.0;

		vertOut_n = normalVec;
//		vertOut_t = (normalize(modelViewIT*vFaceTangent)).xyz;
//		vertOut_b = (normalize(modelViewIT*vFaceBinormal)).xyz;

		vertOut_vNormal = normalVec;
//		vertOut_vEye = (modelView*vPosition).xyz;
//		vertOut_vPosition = (modelView*vPosition).xyz;

		vertOut_Color = vColor.xyz;

		gl_Position = vertOut_fClipPosition;
	}