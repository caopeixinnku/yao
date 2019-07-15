
//agf_include "ctl_sketch_interpolants.glsl"

//agf_include "ctl_sketch_fragment_common.glsl"

const float sigma = 0.5f;
const int fr = 1;


uniform sampler2D SamplerHighImg;

void main()
{
    vec2 tex = vertOut_fTexCoord0.xy;
    vec4 aoutput = vec4(0.0, 0.0, 0.0, 0.0);
    float kernel_sum = 0;
    if (tex.x <= 0.5 && tex.y <= 0.5) {
        for(int i=-fr;i<=fr;i++) {
            for(int j=-fr;j<=fr;j++) {
                vec2 offset = vec2(j,i)*psize;
                float weight = exp(-(i*i+j*j)/(2*sigma*sigma));
                aoutput += weight*texture2D(SamplerHighImg, tex*2.0+offset);
                kernel_sum += weight;
            }
        }
        aoutput /= kernel_sum;
    }
    
    gl_FragColor = aoutput;
    
}

