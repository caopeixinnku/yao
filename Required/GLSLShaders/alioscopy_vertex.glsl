
varying vec3  texCoord;
void main(void)
	{																		
	vec3 multipliers = vec3(1.0, 0.125, 1.0);							
	gl_Position = vec4(gl_Vertex.xy, 0.0 , 1.0);						
																		
	gl_Position = sign(gl_Position);									
																		
	vec2 pos = gl_Position.xy;											
	texCoord.xy = (pos + vec2( 1.0 )) / vec2(2.0);	
	texCoord.z = texCoord.x * 400.0 * 3.0 + (1.0-texCoord.y) * 400.0 + 0.5;	
	texCoord = texCoord * multipliers;									
	}																			