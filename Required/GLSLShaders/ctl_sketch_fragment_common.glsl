
float psize = 1.0/512.0;

const float pi = 3.141592;

const float line_width=1.0;


/// Parameters -----------------------------------------------------------------
float rayTripleOffset = 1.0/512.0;
float th0 = 0.00000000001;
float th1 = 0.000001;
float th2 = 0.000001;


struct COMPUTE_PD_IN {
    vec3 point0;
    vec3 normal0;
    vec3 point1;
    vec3 normal1;
    vec3 point2;
    vec3 normal2;
};
struct COMPUTE_PD_OUT {
    vec3 minDir;
    vec3 maxDir;
    float singularDegree;
};

float matrix3_determinant(in mat3x3 M) {
    
	float a11 = M[0][0];
	float a12 = M[0][1];
	float a13 = M[0][2];


	float a21 = M[1][0];
	float a22 = M[1][1];
	float a23 = M[1][2];

	float a31 = M[2][0];
	float a32 = M[2][1];
	float a33 = M[2][2];

	float det = a11*(a22*a33-a23*a32)-a12*(a21*a33-a23*a31)+a13*(a21*a32-a22*a31);

 //   float det =     M[0][2]*M[1][1]*M[2][0] + M[0][1]*M[1][2]*M[2][0]+ M[0][2]*M[1][0]*M[2][1]
 //                   - M[0][0]*M[1][2]*M[2][1] - M[0][1]*M[1][0]*M[2][2] + M[0][0]*M[1][1]*M[2][2];
    
    return det;
}

bool isfinite_1f(float s)
{
    // By IEEE 754 rule, 2*Inf equals Inf
    return (s == s) && ((s == 0) || (s != 2*s));
}

bool isnan_1f(float s)
{
    // By IEEE 754 rule, NaN is not equal to NaN
    return s != s;
}


/// Core functions -------------------------------------------------------------
COMPUTE_PD_OUT computePrincipalDirection(in COMPUTE_PD_IN pdin) {
    COMPUTE_PD_OUT o;
     o.minDir = vec3(0.0, 0.0, 0.0);
	 o.maxDir = vec3(0.0, 0.0, 0.0);
	 o.singularDegree = 0.0;

    //------------- get up and right vector ----------------
    vec3 right = vec3(0,0,1);
    vec3 up = vec3(0,0,1);
    
    if (pdin.normal0.x != 0) {
        right.y = pdin.normal0.x;
        right.x = - pdin.normal0.y;
        right.z = 0;
    }
    else if (pdin.normal0.y != 0) {
        right.x = pdin.normal0.y;
        right.y = - pdin.normal0.x;
        right.z = 0;
    }
    else if (pdin.normal0.z != 0) {
        right.x = pdin.normal0.z;
        right.z = - pdin.normal0.x;
        right.y = 0;
    }
    
    up = normalize(cross(pdin.normal0, right));
    
    //---------------- get u,v,s,t -------------------------
    vec4 ray = vec4(0,0,0,0);
    vec4 ray1 = vec4(0,0,0,0);
    
    
    vec3 v1 = cross(pdin.normal1, up);
    vec3 v2 = cross(pdin.normal1, right);
    vec3 v3 = (pdin.point1 - pdin.point0);
    
    ray1.x = dot(v3,v1)/dot(right,v1);
    ray1.y = dot(v3,v2)/dot(up,v2);
    
    v3 -= pdin.normal0;
    ray1.z = dot(v3,v1)/dot(right,v1);
    ray1.w = dot(v3,v2)/dot(up, v2);
    
    vec4 ray2 = vec4(0,0,0,0);
    v1 = cross(pdin.normal2, up);
    v2 = cross(pdin.normal2, right);
    v3 = pdin.point2 - pdin.point0;
    
    ray2.x = dot(v3,v1)/dot(right,v1);
    ray2.y = dot(v3,v2)/dot(up,v2);
    
    v3 -= pdin.normal0;
    ray2.z = dot(v3,v1)/dot(right,v1);
    ray2.w = dot(v3,v2)/dot(up, v2);
    
    
    //Coefficients of GLC --------------------------------------------------------
    float temp_A = matrix3_determinant(mat3x3(ray.z - ray.x, ray.w - ray.y, 1,
                                      ray1.z - ray1.x, ray1.w - ray1.y, 1, ray2.z - ray2.x, ray2.w - ray2.y, 1));
    
    float temp_C = matrix3_determinant(mat3x3(ray.x, ray.y, 1, ray1.x,	ray1.y, 1, ray2.x, ray2.y, 1));
    
    float temp_B = matrix3_determinant(mat3x3(ray.z, ray.y, 1, ray1.z, ray1.y, 1, ray2.z, ray2.y, 1))
    - matrix3_determinant(mat3x3(ray.w, ray.x, 1, ray1.w, ray1.x, 1, ray2.w, ray2.x, 1))
    - 2 * temp_C;
    
    //two root for glc characteristic equation

	float DD = pow(temp_B,2.0) - 4.0*temp_A*temp_C;

	if (DD<th0)
		{
		o.minDir = vec3(0,0,0);
        o.maxDir = vec3(0,0,0);
        o.singularDegree = 0;
		return o;
		}

    float z0 = (-temp_B - sqrt(DD))/(2.0*temp_A);
    float z1 = (-temp_B + sqrt(DD))/(2.0*temp_A);
    
    
    vec3 dir0, dir1;
    float curvature0 = -1/z0;
    float curvature1 = -1/z1;
    
    // get principal directions from slits direction..
    vec3   avec1 = pdin.point2 + (pdin.normal2*z0);
    vec3   avec2 = pdin.point1 + (pdin.normal1*z0/dot(normalize(pdin.normal2),normalize(pdin.normal1)));
    dir0 = normalize(avec1 - avec2);  //principal direction 1
    
    vec3 avec3 = pdin.point2 + (pdin.normal2*z1);
    vec3 avec4 = pdin.point1 + (pdin.normal1*z1/dot(normalize(pdin.normal2),normalize(pdin.normal1)));
    dir1 = normalize(avec3 - avec4);  //principal direction 2
    
    
    //min Curvature corresponds to max direction
    if(abs(curvature0)>abs(curvature1)) {
        o.minDir = dir0;
        o.maxDir = dir1;
    }
    else {
        o.minDir = dir1;
        o.maxDir = dir0;
    }
    o.singularDegree = 1;
    
    //locally planar/spherical shapes
    if( !isfinite_1f(z0) || isnan_1f(z0) || !isfinite_1f(z1) || isnan_1f(z1)) {
        o.singularDegree = 0;
        o.maxDir = vec3(0,0,0);
    }
    if(DD < th0) {
        o.minDir = vec3(0,0,0);
        o.maxDir = vec3(0,0,0);
        o.singularDegree = 0;
    }
    
    //locally cylindrical shapes
    if(abs(temp_A) <= th1 && abs(temp_B) >= th2) {
        o.singularDegree = 0.5f;
        z0 = -temp_C/temp_B;
        
        vec3 avec1 = pdin.point2 + (pdin.normal2*z0) ;
        vec3 avec2 = pdin.point1 + (pdin.normal1*z0/dot(normalize(pdin.normal2),normalize(pdin.normal1))) ;
        
        o.minDir = normalize(avec1 - avec2);  //principal direction 1
        o.maxDir = vec3(0,0,0);
    }
    return o;
}

float matrix_determinant(mat4x4 M) {
    
    float det = 	M[0][3]*M[1][2]*M[2][1]*M[3][0] - M[0][2]*M[1][3]*M[2][1]*M[3][0] - M[0][3]*M[1][1]*M[2][2]*M[3][0] + M[0][1]*M[1][3]*M[2][2]*M[3][0]+
    M[0][2]*M[1][1]*M[2][3]*M[3][0] - M[0][1]*M[1][2]*M[2][3]*M[3][0] - M[0][3]*M[1][2]*M[2][0]*M[3][1] + M[0][2]*M[1][3]*M[2][0]*M[3][1]+
    M[0][3]*M[1][0]*M[2][2]*M[3][1] - M[0][0]*M[1][3]*M[2][2]*M[3][1] - M[0][2]*M[1][0]*M[2][3]*M[3][1] + M[0][0]*M[1][2]*M[2][3]*M[3][1]+
    M[0][3]*M[1][1]*M[2][0]*M[3][2] - M[0][1]*M[1][3]*M[2][0]*M[3][2] - M[0][3]*M[1][0]*M[2][1]*M[3][2] + M[0][0]*M[1][3]*M[2][1]*M[3][2]+
    M[0][1]*M[1][0]*M[2][3]*M[3][2] - M[0][0]*M[1][1]*M[2][3]*M[3][2] - M[0][2]*M[1][1]*M[2][0]*M[3][3] + M[0][1]*M[1][2]*M[2][0]*M[3][3]+
    M[0][2]*M[1][0]*M[2][1]*M[3][3] - M[0][0]*M[1][2]*M[2][1]*M[3][3] - M[0][1]*M[1][0]*M[2][2]*M[3][3] + M[0][0]*M[1][1]*M[2][2]*M[3][3];
    
    return det;
}

mat4x4 matrix_inverse(mat4x4 M) {
    
    mat4x4 temp;
    mat4x4 identity;
    
    temp[0][0] = M[1][2]*M[2][3]*M[3][1] - M[1][3]*M[2][2]*M[3][1] + M[1][3]*M[2][1]*M[3][2] - M[1][1]*M[2][3]*M[3][2] - M[1][2]*M[2][1]*M[3][3] + M[1][1]*M[2][2]*M[3][3];
    temp[0][1] = M[0][3]*M[2][2]*M[3][1] - M[0][2]*M[2][3]*M[3][1] - M[0][3]*M[2][1]*M[3][2] + M[0][1]*M[2][3]*M[3][2] + M[0][2]*M[2][1]*M[3][3] - M[0][1]*M[2][2]*M[3][3];
    temp[0][2] = M[0][2]*M[1][3]*M[3][1] - M[0][3]*M[1][2]*M[3][1] + M[0][3]*M[1][1]*M[3][2] - M[0][1]*M[1][3]*M[3][2] - M[0][2]*M[1][1]*M[3][3] + M[0][1]*M[1][2]*M[3][3];
    temp[0][3] = M[0][3]*M[1][2]*M[2][1] - M[0][2]*M[1][3]*M[2][1] - M[0][3]*M[1][1]*M[2][2] + M[0][1]*M[1][3]*M[2][2] + M[0][2]*M[1][1]*M[2][3] - M[0][1]*M[1][2]*M[2][3];
    temp[1][0] = M[1][3]*M[2][2]*M[3][0] - M[1][2]*M[2][3]*M[3][0] - M[1][3]*M[2][0]*M[3][2] + M[1][0]*M[2][3]*M[3][2] + M[1][2]*M[2][0]*M[3][3] - M[1][0]*M[2][2]*M[3][3];
    temp[1][1] = M[0][2]*M[2][3]*M[3][0] - M[0][3]*M[2][2]*M[3][0] + M[0][3]*M[2][0]*M[3][2] - M[0][0]*M[2][3]*M[3][2] - M[0][2]*M[2][0]*M[3][3] + M[0][0]*M[2][2]*M[3][3];
    temp[1][2] = M[0][3]*M[1][2]*M[3][0] - M[0][2]*M[1][3]*M[3][0] - M[0][3]*M[1][0]*M[3][2] + M[0][0]*M[1][3]*M[3][2] + M[0][2]*M[1][0]*M[3][3] - M[0][0]*M[1][2]*M[3][3];
    temp[1][3] = M[0][2]*M[1][3]*M[2][0] - M[0][3]*M[1][2]*M[2][0] + M[0][3]*M[1][0]*M[2][2] - M[0][0]*M[1][3]*M[2][2] - M[0][2]*M[1][0]*M[2][3] + M[0][0]*M[1][2]*M[2][3];
    temp[2][0] = M[1][1]*M[2][3]*M[3][0] - M[1][3]*M[2][1]*M[3][0] + M[1][3]*M[2][0]*M[3][1] - M[1][0]*M[2][3]*M[3][1] - M[1][1]*M[2][0]*M[3][3] + M[1][0]*M[2][1]*M[3][3];
    temp[2][1] = M[0][3]*M[2][1]*M[3][0] - M[0][1]*M[2][3]*M[3][0] - M[0][3]*M[2][0]*M[3][1] + M[0][0]*M[2][3]*M[3][1] + M[0][1]*M[2][0]*M[3][3] - M[0][0]*M[2][1]*M[3][3];
    temp[2][2] = M[0][1]*M[1][3]*M[3][0] - M[0][3]*M[1][1]*M[3][0] + M[0][3]*M[1][0]*M[3][1] - M[0][0]*M[1][3]*M[3][1] - M[0][1]*M[1][0]*M[3][3] + M[0][0]*M[1][1]*M[3][3];
    temp[2][3] = M[0][3]*M[1][1]*M[2][0] - M[0][1]*M[1][3]*M[2][0] - M[0][3]*M[1][0]*M[2][1] + M[0][0]*M[1][3]*M[2][1] + M[0][1]*M[1][0]*M[2][3] - M[0][0]*M[1][1]*M[2][3];
    temp[3][0] = M[1][2]*M[2][1]*M[3][0] - M[1][1]*M[2][2]*M[3][0] - M[1][2]*M[2][0]*M[3][1] + M[1][0]*M[2][2]*M[3][1] + M[1][1]*M[2][0]*M[3][2] - M[1][0]*M[2][1]*M[3][2];
    temp[3][1] = M[0][1]*M[2][2]*M[3][0] - M[0][2]*M[2][1]*M[3][0] + M[0][2]*M[2][0]*M[3][1] - M[0][0]*M[2][2]*M[3][1] - M[0][1]*M[2][0]*M[3][2] + M[0][0]*M[2][1]*M[3][2];
    temp[3][2] = M[0][2]*M[1][1]*M[3][0] - M[0][1]*M[1][2]*M[3][0] - M[0][2]*M[1][0]*M[3][1] + M[0][0]*M[1][2]*M[3][1] + M[0][1]*M[1][0]*M[3][2] - M[0][0]*M[1][1]*M[3][2];
    temp[3][3] = M[0][1]*M[1][2]*M[2][0] - M[0][2]*M[1][1]*M[2][0] + M[0][2]*M[1][0]*M[2][1] - M[0][0]*M[1][2]*M[2][1] - M[0][1]*M[1][0]*M[2][2] + M[0][0]*M[1][1]*M[2][2];
    
    identity[0][0] = 1; identity[0][1] = 0; identity[0][2] = 0; identity[0][3] = 0;
    identity[1][0] = 0; identity[1][1] = 1; identity[1][2] = 0; identity[1][3] = 0;
    identity[2][0] = 0; identity[2][1] = 0; identity[2][2] = 1; identity[2][3] = 0; 
    identity[3][0] = 0; identity[3][1] = 0; identity[3][2] = 0; identity[3][3] = 1;
    
    float det = matrix_determinant(M);
    
    if (det!=0) {
        temp = temp* (1.0/(det));
        return temp;
    }
    else {
        return identity;
    }
}

