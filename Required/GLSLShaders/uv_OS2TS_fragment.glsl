//agf_include "core_fragment.glsl"

//agf_include "vertex2fragment_uv2_tbn.glsl"

uniform sampler2D   objectSpaceNormalMap;
uniform mat4		objectSpaceNormalMapTextureMatrix;

    void main()
    {
        //Object space to tangent space normal map mapping
        vec4 tex_coord = vec4(vertOut_UV.x, 1.0-vertOut_UV.y, 0.0, 1.0);
        vec4 texLookup =  xformTex2D(objectSpaceNormalMap, tex_coord, objectSpaceNormalMapTextureMatrix);
        vec3 objectSpaceNormal = ((texLookup.xyz-vec3(0.49803921568, 0.49803921568, 0.49803921568))*2.00787401577);
        
        vec3 t = normalize(vertOut_t.xyz);
        vec3 b = normalize(vertOut_b.xyz);
        vec3 n = normalize(vertOut_n.xyz);
        float a11 = t.x;
        float a21 = t.y;
        float a31 = t.z;
        float a12 = b.x;
        float a22 = b.y;
        float a32 = b.z;
        float a13 = n.x;
        float a23 = n.y;
        float a33 = n.z;
        float invDet = 1.0/(a11*a22*a33+a21*a32*a13+a31*a12*a23-a11*a32*a23-a31*a22*a13-a21*a12*a33);
        t = invDet*vec3((a22*a33-a23*a32), (a23*a31-a21*a33), (a21*a32-a22*a31));
        b = invDet*vec3((a13*a32-a12*a33), (a11*a33-a13*a31), (a12*a31-a11*a32));
        n = invDet*vec3((a12*a23-a13*a22), (a13*a21-a11*a23), (a11*a22-a12*a21));
        
        vec3 fromObjectToTangent = objectSpaceNormal;
        fromObjectToTangent.x = t.x*objectSpaceNormal.x+b.x*objectSpaceNormal.y+n.x*objectSpaceNormal.z;
        fromObjectToTangent.y = t.y*objectSpaceNormal.x+b.y*objectSpaceNormal.y+n.y*objectSpaceNormal.z;
        fromObjectToTangent.z = t.z*objectSpaceNormal.x+b.z*objectSpaceNormal.y+n.z*objectSpaceNormal.z;
        vec3 tangentSpaceNormal = normalize(fromObjectToTangent);
        vec3 mapNormal = (tangentSpaceNormal+vec3(1.0, 1.0, 1.0))*vec3(0.49803921568, 0.49803921568, 0.49803921568); 
        vec4 finalColor = vec4(mapNormal.r, mapNormal.g, mapNormal.b, 1.0);
        gl_FragColor = finalColor;
    }