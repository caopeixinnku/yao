

//Use glBindAttribLocation to bind those to specific attribute indices.

//#define AGF_VERTEX_ATTRIBUTE_ARRAY_INDEX_GL3	0
//#define AGF_COLOR_ATTRIBUTE_ARRAY_INDEX_GL3		1
//#define AGF_NORMAL_ATTRIBUTE_ARRAY_INDEX_GL3	2
//#define AGF_TEXTURE_ATTRIBUTE_ARRAY_INDEX_GL3	3 
//#define AGF_TANGENT_ATTRIBUTE_ARRAY_INDEX_GL3	4
//#define AGF_BINORMAL_ATTRIBUTE_ARRAY_INDEX_GL3	5


//#define GPU_SKINNING				1
//#define GPU_SKINNING_MAXBONES		64
attribute vec3 agf_position;        //0
attribute vec4 agf_color;           //1
attribute vec3 agf_normal;          //2
attribute vec2 agf_uv;              //3
attribute vec3 agf_tangent;         //4
attribute vec3 agf_binormal;        //5



vec4 AGFVS_VERTEX()
	{
	vec4 temp = agf_position.xyzz;
	temp.w = 1.0;
	return temp;
	}

vec4 AGFVS_COLOR()
	{
	vec4 temp = agf_color.xyzw;
	return temp;
	}

vec4 AGFVS_NORMAL()
	{
	vec4 temp = agf_normal.xyzz;
	temp.w = 0.0;
	return temp;
	}

vec4 AGFVS_UVW()
	{
	vec4 temp = agf_uv.xyxy;
	temp.z = 0.0;
	temp.w = 0.0;
	return temp;
	}

vec4 AGFVS_TANGENT()
	{
	vec4 temp = agf_tangent.xyzz;
	temp.w = 0.0;
	return temp;
	}

vec4 AGFVS_BINORMAL()
	{
	vec4 temp = agf_binormal.xyzz;
	temp.w = 0.0;
	return temp;
	}

uniform mat4 agf_mvp_matrix;


mat4 AGF_MATRIX_MVP()
	{
	return agf_mvp_matrix;
	}

#ifdef GPU_SKINNING

attribute vec4 agf_bone_indices;	//6
attribute vec4 agf_bone_weights;	//7

uniform int    agf_bonecount;
//uniform mat4x4 agf_bone_matrices[GPU_SKINNING_MAXBONES];
//uniform mat4x4 agf_bone_IT_matrices[GPU_SKINNING_MAXBONES];

uniform vec4   row1_bone_matrices[GPU_SKINNING_MAXBONES];
uniform vec4   row2_bone_matrices[GPU_SKINNING_MAXBONES];
uniform vec4   row3_bone_matrices[GPU_SKINNING_MAXBONES];
uniform vec4   quaternion_direction_rotations[GPU_SKINNING_MAXBONES];



mat4x4 BoneMatrix(in float indexf)
{
	vec4 row1 = row1_bone_matrices[int(indexf)];
	vec4 row2 = row2_bone_matrices[int(indexf)];
	vec4 row3 = row3_bone_matrices[int(indexf)];

	vec4 column1 = vec4(row1[0], row2[0], row3[0], 0.0);
	vec4 column2 = vec4(row1[1], row2[1], row3[1], 0.0);
	vec4 column3 = vec4(row1[2], row2[2], row3[2], 0.0);
	vec4 column4 = vec4(row1[3], row2[3], row3[3], 1.0);

	mat4x4 result = mat4x4(column1, column2, column3, column4);
	
	return result;
}

mat4x4 BoneDirectionMatrix(in float indexf)
{
	vec4 quat = quaternion_direction_rotations[int(indexf)];

	float X, Y, Z, W;
	X = quat.x;
	Y = quat.y;
	Z = quat.z;
	W = quat.w;
	
	float xx      = X * X;
    float xy      = X * Y;
    float xz      = X * Z;
    float xw      = X * W;

    float yy      = Y * Y;
    float yz      = Y * Z;
    float yw      = Y * W;

    float zz      = Z * Z;
    float zw      = Z * W;
	
	
	vec3 row1, row2, row3;

	row1[0]  = 1 - 2 * ( yy + zz );
    row1[1]  =     2 * ( xy - zw );
    row1[2]  =     2 * ( xz + yw );

    row2[0]  =     2 * ( xy + zw );
    row2[1]  = 1 - 2 * ( xx + zz );
    row2[2]  =     2 * ( yz - xw );

    row3[0]  =     2 * ( xz - yw );
    row3[1]  =     2 * ( yz + xw );
    row3[2] = 1 - 2 * ( xx + yy );
	
	vec4 column1 = vec4(row1[0], row2[0], row3[0], 0.0);
	vec4 column2 = vec4(row1[1], row2[1], row3[1], 0.0);
	vec4 column3 = vec4(row1[2], row2[2], row3[2], 0.0);
	vec4 column4 = vec4(0.0, 0.0,  0.0, 1.0);

	mat4x4 result = mat4x4(column1, column2, column3, column4);
	
	return result;
}

vec4 SkinVertex(in vec4 unskinnedVertexPosition)
{
    vec4 result = agf_bone_weights.x * (BoneMatrix(agf_bone_indices.x)*unskinnedVertexPosition);
    result = result + agf_bone_weights.y * (BoneMatrix(agf_bone_indices.y)*unskinnedVertexPosition);
    result = result + agf_bone_weights.z * (BoneMatrix(agf_bone_indices.z)*unskinnedVertexPosition);
    result = result + agf_bone_weights.w * (BoneMatrix(agf_bone_indices.w)*unskinnedVertexPosition);
    return result;
}

vec4 SkinDirection(in vec4   unskinnedDirection)
{
    vec4 unskinnedDirectionOnly = unskinnedDirection;
    unskinnedDirectionOnly.w = 0.0;
    vec4 result = agf_bone_weights.x * (BoneDirectionMatrix(agf_bone_indices.x)*unskinnedDirectionOnly);
    result = result + agf_bone_weights.y * (BoneDirectionMatrix(agf_bone_indices.y)*unskinnedDirectionOnly);
    result = result + agf_bone_weights.z * (BoneDirectionMatrix(agf_bone_indices.z)*unskinnedDirectionOnly);
    result = result + agf_bone_weights.w * (BoneDirectionMatrix(agf_bone_indices.w)*unskinnedDirectionOnly);
    return result;
}

#endif