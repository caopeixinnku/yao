
#define M_PI		3.1415926535898
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
vec4 texSPHEREIdentity(in sampler2D sphereTex, in vec3 lookup_vector)
{
    vec2 index;
    vec3 reflectDir;
    vec4 sphereColor;
    index = uvSPHERE(lookup_vector);
    sphereColor = texture2D(sphereTex, index);
    return sphereColor;
}
/***********************************************************************/






	  