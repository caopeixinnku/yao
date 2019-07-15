
//agf_include "core_vertex.glsl"

//agf_include "main_vertex2fragment.glsl"


uniform mat4 modelViewProj;
uniform mat4 modelView;

void main()
	{
		vec4 vPosition =		AGFVS_VERTEX();

#ifdef GPU_SKINNING
        if (agf_bonecount > 0)
        {
            vPosition = SkinVertex(vPosition);
        }
#endif

		vertOut_fClipPosition = modelViewProj * vPosition;

		vertOut_vPosition = (modelView*vPosition).xyz;

		gl_Position = vertOut_fClipPosition;
	}