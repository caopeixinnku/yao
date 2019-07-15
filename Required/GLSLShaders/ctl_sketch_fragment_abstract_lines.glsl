
//agf_include "ctl_sketch_interpolants.glsl"

//agf_include "ctl_sketch_fragment_common.glsl"

const vec2 image_size = vec2(512.0,512.0);


const float max_dist = 100.0;
const int max_iter = 5;
const float alpha_offset = 0.0;
const int confidence_mode = 1;
const int tapering_mode = 1;

const vec3  dk_color = vec3(0.0, 0.0, 0.0);     // line color in dark regions
const vec3  lt_color = vec3(1.0, 1.0, 1.0);     // line color in light regions
const float light_control = 1.0;   // ratio to curvature thresholds of dk lines

const float curv_thd0=0.05;
const float curv_thd1=0.0; // curvature, distance, gradient thresholds
const int tone_effect=0;
const float moving_factor=0.0;  // control the amount of moving distance

// H 6x9
const float H0 =  0.1666667, H1 = -0.3333333, H2 =  0.1666667; 
const float H3 =  0.1666667, H4 = -0.3333333, H5 =  0.1666667; 
const float H6 =  0.1666667, H7 = -0.3333333, H8 =  0.1666667; 
const float H9 =  0.25, H10 = 0.0, H11 = -0.25, H12 = 0.0; 
const float H13 = 0.0, H14 = 0.0, H15 =-0.25, H16 = 0.0; 
const float H17 = 0.25, H18 =  0.1666667, H19 = 0.1666667; 
const float H20 =  0.1666667, H21 = -0.3333333, H22 = -0.3333333; 
const float H23 = -0.3333333, H24 =  0.1666667, H25 =  0.1666667; 
const float H26 =  0.1666667, H27 = -0.1666667, H28 =  0.0; 
const float H29 =  0.1666667, H30 = -0.1666667, H31 =  0.0; 
const float H32 =  0.1666667, H33 = -0.1666667, H34 =  0.0; 
const float H35 =  0.1666667, H36 = -0.1666667, H37 = -0.1666667; 
const float H38 = -0.1666667, H39 =  0.0, H40 = 0.0, H41 = 0.0; 
const float H42 =  0.1666667, H43 =  0.1666667, H44 = 0.1666667; 
const float H45 = -0.1111111, H46 =  0.2222222, H47 = -0.1111111; 
const float H48 =  0.2222222, H49 =  0.5555556, H50 =  0.2222222; 
const float H51 = -0.1111111, H52 =  0.2222222, H53 = -0.1111111; 



uniform sampler2D SamplerSmoothColor;




void 
compute_quadric_coefficients(in vec2 uv, in int channel, in float half_width, out float max_curv, out float axis_dist, out vec2 axis)
{

   float T[6]; // quadric coefficients
   float A[9]; // height values

   int i, j;
   float m, n;
   vec2 neigh_uv, diff_uv;
   vec2 scale = vec2(psize, psize);

   m = -half_width;

   for(i = 0; i < 3; i++){ // set 3x3 matrix
      n = -half_width;

      for(j = 0; j < 3; j++){

    diff_uv = vec2(n, m) * scale;
    neigh_uv = uv + diff_uv;

    A[i*3+j] = texture2D(SamplerSmoothColor, neigh_uv)[channel];
    n += half_width;

      }
      m += half_width;
   }


   // H * A
   T[0] = (H0*A[0]) + (H1*A[1]) + (H2*A[2]) + (H3*A[3]) + (H4*A[4]) + (H5*A[5]) 
       + (H6*A[6]) + (H7*A[7]) + (H8*A[8]);
   T[1] = (H9*A[0]) + (H10*A[1]) + (H11*A[2]) + (H12*A[3]) + (H13*A[4]) 
       + (H14*A[5]) + (H15*A[6]) + (H16*A[7]) + (H17*A[8]);
   T[2] = (H18*A[0]) + (H19*A[1]) + (H20*A[2]) + (H21*A[3]) + (H22*A[4]) 
       + (H23*A[5]) + (H24*A[6]) + (H25*A[7]) + (H26*A[8]);
   T[3] = (H27*A[0]) + (H28*A[1]) + (H29*A[2]) + (H30*A[3]) + (H31*A[4]) 
       + (H32*A[5]) + (H33*A[6]) + (H34*A[7]) + (H35*A[8]);
   T[4] = (H36*A[0]) + (H37*A[1]) + (H38*A[2]) + (H39*A[3]) + (H40*A[4]) 
       + (H41*A[5]) + (H42*A[6]) + (H43*A[7]) + (H44*A[8]);
   T[5] = (H45*A[0]) + (H46*A[1]) + (H47*A[2]) + (H48*A[3]) + (H49*A[4]) 
       + (H50*A[5]) + (H51*A[6]) + (H52*A[7]) + (H53*A[8]);

   float a, b, c, d, e, f, l1, l2;
   // quadric form ax^2 + 2bxy + cy^2 + 2dx + 2ey + f
   
   a = T[0];
   b = 0.5*T[1];
   c = T[2];
   d = 0.5*T[3];  
   e = 0.5*T[4];
   f = T[5];

   // 2x2 symmetric matrix used in the quadratic form:
   //   a b 
   //   b c 

   // compute eigenvalues 
   // can optimize:

   float sqrt_term = sqrt((a-c)*(a-c) + 4.0*(b*b));
   l1 = (a+c + sqrt_term)*0.5;
   l2 = (a+c - sqrt_term)*0.5;

   // max_curv: maximum curvature
   if(abs(l1) >= abs(l2)){
      max_curv = l1;
   }
   else{
      max_curv = l2;
   }

   if(abs(b) <= 1.0e-8){           // eigen vector corresponding 
                           // to larger magnitude of eigen value
      if(abs(a) > abs(b)){ // axis: axis perpendicular to line
    axis.x = 1.0;
    axis.y = 0.0;   
      }
      else{
    axis.x = 0.0;
    axis.y = 1.0;
      }
   }
   else{
      if( abs(l1) >= abs(l2))
    axis.y = -(a-l1)/b;
      else
    axis.y = -(a-l2)/b;

      axis.x = 1.0;
   }

   float len = length(axis);

   axis /= len; // normalize the eigen vector

   // compute the center (x0, y0) of quadric function
   // quadric form ax^2 + 2bxy + cy^2 + 2dx + 2ey + f
   // put x = x' + x0, y = y' + y0
   // x' term and y' term should be 0
   // a*x0 + b*y0 +d = 0 (1)
   // b*x0 + c*y0 +e = 0 (2)

   // solve (1) and (2)
   float t[2], invS[4], x0, y0;

   t[0] = -d;
   t[1] = -e;

   float det = a*c-b*b;

   if(abs(det) > 1.0e-15){ // unique solution
      invS[0] = c/det;
      invS[1] = -b/det;
      invS[2] = -b/det;
      invS[3] = a/det;

      x0 = invS[0]*t[0]+invS[1]*t[1];
      y0 = invS[2]*t[0]+invS[3]*t[1];


      // axis_dist: distance to the axis
      axis_dist = axis.x*x0 + axis.y*y0;
   }
   else if(abs(b*d - e*a) < 1.0e-15){
      axis_dist = abs(d)/sqrt(a*a + b*b);
   }
   else{
      axis_dist = max_dist;
   }

   // Gx = 2ax + 2by + d 
   // Gy = 2bx + 2cy + e
   // at (0, 0), G = (d, e)
   //grad = vec2(T[3], T[4]);

}


float compute_alpha(in float center_val, in float max_curv, in float dist, in float c_thd0, in float c_thd1)
{
   float val;

   if(tone_effect == 1){
      if(max_curv > 0.0){
         val = clamp(1.0-center_val + alpha_offset, 0.0, 1.0);
      }
      else{
         val = clamp(center_val + alpha_offset, 0.0, 1.0);
      }
   }
   else{
      val = 1.0;
   }
      
   if(abs(max_curv) < c_thd0){
      if(confidence_mode == 1)
         val *= (abs(max_curv)-c_thd1)/(c_thd0-c_thd1);
      else
         val = 0.0;
   }
      
   if(tapering_mode == 1){
      float a = sqrt(2.0 - dist)*0.5;
      
      //if(a > 0.6)
      //    a = 1.0;
      val *= a;
   }
   
   return val;
} 

vec4 draw_line_pixel(in vec2 uv)
{
   vec2 diff;
   vec2 pix = uv*image_size, pix2;
   float max_curv, axis_dist;
   vec2 axis;
   float half_width = line_width*0.5;
   float c_thd0, c_thd1; // c_thd0: upper bound c_thd1: lower bound
   float l_c_thd0, l_c_thd1; // light thresholds
   
   c_thd0 = curv_thd0 * half_width;
   c_thd1 = curv_thd1 * half_width;
   l_c_thd0 = c_thd0 * light_control;
   l_c_thd1 = c_thd1 * light_control;   
   
   vec4 col = vec4(0.0, 0.0, 0.0, 0.0);
   
   pix2 = pix;
   
   float center_val = texture2D(SamplerSmoothColor, uv).r;
   
   for(int k = 0; k < max_iter; k++){ // move to the axis...
      compute_quadric_coefficients(uv, 0, half_width, max_curv, axis_dist, axis);
      
      diff = min((axis_dist* axis * half_width)*moving_factor, 2.0);
      pix2 = pix2 + diff;
      
      uv = pix2 * psize;      
   }

   float dist = clamp(length(pix - pix2)/half_width, 0.0, 2.0);
   if(max_curv > c_thd1){
      col.rgb = dk_color;
      col.a = compute_alpha(center_val, max_curv, dist, c_thd0, c_thd1);
   }
   else if(max_curv < -c_thd1) {
      col.rgb = lt_color;
      col.a = compute_alpha(center_val, max_curv, dist, l_c_thd0, l_c_thd1);         
   }

   
      
   return vec4(1-col.rgb*col.a,1);
}

//EOF

void main()
{
    vec2 tex = vertOut_fTexCoord0.xy;
    gl_FragColor = draw_line_pixel(tex);
}


