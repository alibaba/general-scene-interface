
// 矩阵
uniform mat4 modelViewMatrix;
uniform mat4 normalMatrix;
uniform mat4 modelMatrix;
uniform mat4 projectionMatrix;

// 相机
uniform vec3 cameraPosition;

// @TODO: 应该弄成define，性能更好
// uniform int USE_MAP;
uniform mat3 uvTransform;
uniform sampler2D map;

#ifdef GL2_POINT
uniform float pointSize;
#endif

// 基本材质
struct Material {
    // vec3 ambient; // 环境光反射颜色，通常和漫反射一样
	vec3 diffuse; // 漫反射颜色
	vec3 specular; // 镜面反射颜色
	// float specularStrength; // 镜面高光的强度
	float shininess; // 镜面高光的散射/半径
	float opacity; // 透明度
};
uniform Material material;


// @TODO: 光源数量
// uniform int USE_POINT_LIGHT;
// uniform int USE_AMBIENT_LIGHT;
// uniform int USE_DIRECTIONAL_LIGHT;


// - 方向光
struct DirectionalLight {
	vec3 direction;
	vec3 color;
};
uniform DirectionalLight directionalLight[ 2 ];

// - 点光
struct PointLight {
	vec3 position;
	vec3 color;
	float distance;
	float decay;
};
uniform PointLight pointLights[ 2 ];

// - 全局光
struct AmbientLight {
	vec3 color;
	// float intensity;
};
uniform AmbientLight ambientLight[ 2 ];
