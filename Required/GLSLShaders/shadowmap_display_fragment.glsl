//agf_include "vertex2fragment_uv2.glsl"

uniform sampler2D tex;
void main()
	{
    gl_FragColor = texture2D(tex, vertOut_UV);
	}
