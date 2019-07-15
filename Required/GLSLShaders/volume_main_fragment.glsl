//agf_include "volume_vertex2fragment.glsl"



vec4 ShadeVolume(   in vec3 position,
				   in sampler3D voltexture, 
				   in vec4 modulatingColor, 
				   in vec3 gradientSamplingDistancesTexture,
				   in vec3 gradientSamplingDistancesObject,
				   in sampler1D transfer_function)
{
float value;
float gradMagnitude = 1.0;
vec4 outcolor=vec4(1, 1, 1, 1);
    vec4 main_lookup = texture3D(voltexture, position);
vec3 dx, dy, dz;
vec3 gradient;
float v0, v1;

#ifdef USE_VOLUME_COLOR
outcolor.a = main_lookup.a;
outcolor.rgb = main_lookup.rgb;
#else
value = main_lookup.r;
outcolor.a = value;

#ifdef USE_VOLUME_1D_TRANSFER_FUNCTION
	vec4 tfTexLookup;
	tfTexLookup = texture1D(transfer_function, value);
	outcolor.rgb = tfTexLookup.rgb;
	outcolor.a = tfTexLookup.a;
#endif
    
#ifdef USE_VOLUME_SHADING_GRADIENT
	dx = vec3(1, 0, 0)*gradientSamplingDistancesTexture.xyz;
	dy = vec3(0, 1, 0)*gradientSamplingDistancesTexture.xyz;
	dz = vec3(0, 0, 1)*gradientSamplingDistancesTexture.xyz;
	v0 = texture3D(voltexture, position-dx).r;
	v1 = texture3D(voltexture, position+dx).r;
	gradient.x = (v1-v0)*0.5/gradientSamplingDistancesObject.x;
	v0 = texture3D(voltexture, position-dy).r;
	v1 = texture3D(voltexture, position+dy).r;
	gradient.y = (v1-v0)*0.5/gradientSamplingDistancesObject.y;
	v0 = texture3D(voltexture, position-dz).r;
	v1 = texture3D(voltexture, position+dz).r;
	gradient.z = (v1-v0)*0.5/gradientSamplingDistancesObject.z;
	gradMagnitude = length(gradient)*20;
#endif
#endif//(of #ifdef USE_VOLUME_COLOR)
    
    
#ifdef USE_VOLUME_GRADIENT_SOLID_RENDERING
	dx = vec3(1, 0, 0)*gradientSamplingDistancesTexture.xyz;
	dy = vec3(0, 1, 0)*gradientSamplingDistancesTexture.xyz;
	dz = vec3(0, 0, 1)*gradientSamplingDistancesTexture.xyz;
	v0 = texture3D(voltexture, position-dx).a;
	v1 = texture3D(voltexture, position+dx).a;
	gradient.x = (v1-v0)*0.5/gradientSamplingDistancesObject.x;
	v0 = texture3D(voltexture, position-dy).a;
	v1 = texture3D(voltexture, position+dy).a;
	gradient.y = (v1-v0)*0.5/gradientSamplingDistancesObject.y;
	v0 = texture3D(voltexture, position-dz).a;
	v1 = texture3D(voltexture, position+dz).a;
	gradient.z = (v1-v0)*0.5/gradientSamplingDistancesObject.z;
	gradMagnitude = length(gradient)*20;
    //gradMagnitude = 1.0;
    vec3 newNormal = normalize(gradient);
    vec3 light = normalize(vec3(1.0, 1.0, 1.0));
    float diffuse = 0.0;
    float diffuse_coeff = 1.0;
    float nDotVP = max (0.0, (dot(newNormal, light)));
    diffuse += diffuse_coeff * nDotVP;
    gradMagnitude *= 40.0;
    outcolor.rgb = vec3(diffuse, diffuse, diffuse);
#endif//(of #ifdef USE_VOLUME_GRADIENT_SOLID_RENDERING)
    
    
outcolor.a *= modulatingColor.a*gradMagnitude;
outcolor.rgb *= outcolor.a*modulatingColor.rgb;
return outcolor;
}

uniform sampler3D voltexture;
uniform sampler1D transfer_function;


uniform vec4 clippingPlaneColor;
uniform vec3 gradientSamplingDistancesTexture;
uniform vec3 gradientSamplingDistancesObject;
uniform float use_transfer_function;
uniform vec2 volume_opacity_multiplier;
uniform vec4 volumeColor;

void main()
    {

    vec4 modulatingColor = vec4(1, 1, 1, 1);
    modulatingColor.a = volumeColor.a;
    modulatingColor.a *= volume_opacity_multiplier[0];

    vec4 finalColor =  ShadeVolume(vertOut_UVW.xyz,voltexture, modulatingColor, gradientSamplingDistancesTexture, gradientSamplingDistancesObject, transfer_function);

    if (volumeColor.r<0.5)
        {
        finalColor.a = 1.0 - pow (1.0-finalColor.a, 3);
        finalColor.rgb = finalColor.rgb*3;
        }

    if (volume_opacity_multiplier[1]>0.5)
        {
        finalColor.a = 1.0 - finalColor.a;
        }
        
    gl_FragColor = finalColor;

    }






	  