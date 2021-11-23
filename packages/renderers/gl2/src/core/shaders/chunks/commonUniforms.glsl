
// 矩阵
uniform mat4 modelViewMatrix;
uniform mat4 normalMatrix;
uniform mat4 modelMatrix;

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


// // @TODO: 光源数量，放到vec4里或者define里
// uniform int USE_POINT_LIGHT;
// uniform int USE_AMBIENT_LIGHT;
// uniform int USE_DIRECTIONAL_LIGHT;


// - 方向光
struct DirectionalLight {
	vec3 direction;
	vec3 color;

	int shadow;
	float shadowBias;
	float shadowRadius;
	vec2 shadowMapSize;
};

// #TODO 移走
// void getDirectionalDirectLightIrradiance( const in DirectionalLight directionalLight, const in GeometricContext geometry, out IncidentLight directLight ) {
//     directLight.color = directionalLight.color;
//     directLight.direction = directionalLight.direction;
//     directLight.visible = true;
// }

// - 点光
struct PointLight {
	vec3 position;
	vec3 color;
	float distance;
	float decay;
};

// - 全局光
struct AmbientLight {
	vec3 color;
};

// @NOTE 神奇的是，这里加不加Uniform都可以

// 矩阵
uniform mat4 projectionMatrix;

// 相机
uniform vec3 cameraPosition;

// 光
uniform vec3 ambientLightColor; // @TODO 全局光应该在JS中合并
uniform DirectionalLight directionalLights[2];
uniform AmbientLight ambientLights[2];
uniform PointLight pointLights[2];

// uniform COMMON {
// 	// @NOTE 神奇的是，这里加不加Uniform都可以
//
//     // 矩阵
// 	mat4 projectionMatrix;
//
// 	// 相机
// 	vec3 cameraPosition;
//
//     // 光
// 	vec3 ambientLightColor; // @TODO 全局光应该在JS中合并
// 	DirectionalLight directionalLights[2];
// 	AmbientLight ambientLights[2];
// 	PointLight pointLights[2];
//
// };
