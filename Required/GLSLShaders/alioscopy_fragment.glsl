
													
varying vec3 texCoord;		

uniform sampler2D Sampler;														
uniform vec4 Dims;			
													
												
void main(void)																	
{																				
	float FRAME_WIDTH = Dims.x;													
	float FRAME_HEIGHT = Dims.y;												
	float invertOpacity = Dims.z;												
	float invertFinalOpacity = Dims.w;											
	vec3 multipliers = vec3(1.0, 0.125, 1.0);									
	vec3 offsets0 = vec3(0.0, 0.125, 0.0);										
	vec3 offsets1 = vec3(0.0, 0.25, 0.0);										
																				
	vec3 offset;																
	vec4  pixCoord;																
	vec3 coord;																	
	coord = texCoord;															
	pixCoord.x = (texCoord.x-1.0/(FRAME_WIDTH*2.0))*FRAME_WIDTH;				
	pixCoord.y = (texCoord.y*8.0-1.0/(FRAME_HEIGHT*2.0))*FRAME_HEIGHT;			
	float tripletIDx = fract((pixCoord.x*3.0)/8.0)*8.0;							
	float tripletIDy = 8.0 - fract(pixCoord.y/8.0)*8.0;							
	float tripletIDSUM = tripletIDx+tripletIDy;									
	float tripletIDR = fract((tripletIDSUM+0.0)/8.0);					
	float tripletIDG = fract((tripletIDSUM+1.0)/8.0);						
	float tripletIDB = fract((tripletIDSUM+2.0)/8.0);						
	
	vec2 redCoord = coord.xy+vec2(0.0, tripletIDR);								
	vec2 greenCoord = coord.xy+vec2(0.0, tripletIDG);							
	vec2 blueCoord = coord.xy+vec2(0.0, tripletIDB);							
	vec4 redSample = texture2D( Sampler, fract(redCoord));						
	vec4 greenSample = texture2D( Sampler, fract(greenCoord));					
	vec4 blueSample = texture2D( Sampler, fract(blueCoord));					
	gl_FragColor = redSample;													
	gl_FragColor.g = greenSample.g;												
	gl_FragColor.b = blueSample.b;												
	
	if (invertOpacity>0.5)
		gl_FragColor.a = 0.75*(3.0-redSample.a-greenSample.a-blueSample.a);		
	else
		gl_FragColor.a = 0.75*(redSample.a+greenSample.a+blueSample.a);			

	if (invertFinalOpacity>0.5)													
		gl_FragColor.a = 1.0-gl_FragColor.a ;									

	gl_FragColor.a = clamp(gl_FragColor.a, 0.0, 1.0);							

																				
}