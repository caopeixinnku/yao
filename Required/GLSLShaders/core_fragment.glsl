vec4 xformTex2D(in sampler2D _texture, in vec4 homogeneousUV, in mat4 uvMatrix)
    {
    vec4 xformedUV;
    xformedUV = uvMatrix * homogeneousUV;
    return texture2D(_texture, xformedUV.xy);
    }

vec4 xformTex2DOffset(in sampler2D _texture, in vec4 homogeneousUV, in mat4 uvMatrix, in vec2 offset)
    {
    vec4 xformedUV;
    xformedUV = (uvMatrix * homogeneousUV) + vec4(offset.x, offset.y, 0.0, 0.0);
    return texture2D(_texture, xformedUV.xy);
    }
