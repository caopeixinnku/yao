/// Parameters -----------------------------------------------------------------
const int fr = 6;
const float sigma = 3;
const float edgeThreshold = 0.97;


float dir_w(vec2 v1, vec2 v2) {
	float dotp = dot(v1,v2);
	return dotp;
}
float dist_w(int i)
{

    float nominator = float(fr-abs(float(i))+1);
    float denominator = float(fr+1);
    
    return nominator/denominator;
   // ((float)(fr-abs((float)i)+1))/((float)(fr+1));
}

vec3 dir2tensor(vec2 dir) {
	vec3 s_tensor;
	s_tensor.x = dir.x * dir.x;
	s_tensor.y = dir.x * dir.y;
	s_tensor.z = dir.y * dir.y;
	return s_tensor;
}

vec2 tensor2dir(vec3 tensor) {
	vec2 dir;
	float eigen;
	float a = tensor.x;
	float b = tensor.y;
	float c = b; 
	float d = tensor.z;

	float singularity = 1.0;
   
 	eigen = ( (a+d) + sqrt(pow(a+d,2.0)-4.0*(a*d-b*c)) ) / 2.0;	// larger eigen value
	dir = vec2(-eigen+d+b, eigen-a-c);
   
	dir = normalize(dir);
	return dir;
}