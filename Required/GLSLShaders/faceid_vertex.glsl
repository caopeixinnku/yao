
attribute vec3 agf_position;	//0
attribute vec3 agf_color;		//1

varying vec3 vertOut_Color;
uniform mat4 agf_mvp_matrix;
void main()
    {
    vec4 incomingVertex = agf_position.xyzz;
    incomingVertex.w = 1.0;
    vertOut_Color = 0.00392156862*agf_color; // divide to 255
        
    gl_Position =	agf_mvp_matrix * incomingVertex;
    }






	  