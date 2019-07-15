#extension GL_ARB_shader_texture_lod: require

varying	vec2 vertOut_UV;

struct DofParams
    {
    float _focusDepth1;
    float _relativeApertureSize1;
    float _slope1;
    float _reversedNear1;
    float _reversedFar1;
    float _halfImageHeight1;
    };
uniform DofParams dofparams;
uniform sampler2D _dofTexture1;
uniform sampler2D _dofDepth1;

void main()
    {
    vec4 _depthBufferValue;
    float _depth;
    float _cocRadius;
    float _pixelRadius;
    float _lod;
    
    _depthBufferValue = texture2D(_dofDepth1, vertOut_UV.xy);
    _depth = dofparams._reversedNear1 + _depthBufferValue.x*dofparams._reversedFar1;
    _depth = 1.0/_depth;
    _cocRadius = abs(_depth - dofparams._focusDepth1)*dofparams._relativeApertureSize1;
    _pixelRadius = (_cocRadius*dofparams._slope1*dofparams._halfImageHeight1)/_depth;
    _lod = log2(_pixelRadius*0.5);
    gl_FragColor = texture2DLod(_dofTexture1, vertOut_UV.xy, _lod);
    }
