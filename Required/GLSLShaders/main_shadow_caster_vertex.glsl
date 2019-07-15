
//agf_include "core_vertex.glsl"

//agf_include "main_vertex2fragment.glsl"


uniform mat4 modelViewProj;
uniform mat4 modelView;

void main()
	{
		vec4 vPosition =		AGFVS_VERTEX();
		vec4 vTexCoord0 =		AGFVS_UVW();

	#ifdef GPU_SKINNING
        if (agf_bonecount > 0)
            {
            vPosition = SkinVertex(vPosition);
            }
	#endif

		vertOut_fClipPosition = modelViewProj * vPosition;

        vertOut_fTexCoord0.xy = vTexCoord0.xy;
		vertOut_fTexCoord0.z = 0.0;
		vertOut_fTexCoord0.w = 1.0;

		vertOut_vPosition = (modelView*vPosition).xyz;

		gl_Position = vertOut_fClipPosition;
	}